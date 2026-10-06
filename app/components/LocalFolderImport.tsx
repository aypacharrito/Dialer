'use client';
import {useEffect,useRef,useState} from 'react';
import {folderCsvHeader,folderCsvCell,folderCsvLine,type FolderContact} from '../lib/folder-contact';
import {folderFileKey,openFolderStore,type FolderStore,type FolderFileResult} from '../lib/folder-contact-store';
import {createLocalFolderReader} from '../lib/local-folder-reader';
import {downloadContactsCsv} from '../lib/contact-export';
type SaveWindow=Window&{showSaveFilePicker?:(options:{suggestedName:string;types:Array<{description:string;accept:Record<string,string[]>}>})=>Promise<{createWritable:()=>Promise<{write:(value:string)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>}>};
export default function LocalFolderImport({workspaceId,expanded,onClose,onOpen,onAdd}:{workspaceId:string;expanded:boolean;onClose:()=>void;onOpen:()=>void;onAdd:(rows:FolderContact[])=>void}){
 const input=useRef<HTMLInputElement>(null),store=useRef<FolderStore|null>(null),mounted=useRef(true),controller=useRef<AbortController|null>(null),pause=useRef(false),wake=useRef<(()=>void)|null>(null);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[paused,setPaused]=useState(false),[status,setStatus]=useState('Choose a folder'),[error,setError]=useState(''),[count,setCount]=useState(0),[rows,setRows]=useState<FolderContact[]>([]),[errors,setErrors]=useState<FolderFileResult[]>([]),[progress,setProgress]=useState({done:0,total:0}),[pageStart,setPageStart]=useState(''),[pages,setPages]=useState<string[]>([]);
 const active=useRef(false);
 const [scanning,setScanning]=useState(false);
 useEffect(()=>{
  mounted.current=true;let disposed=false,database:FolderStore|undefined;
  void openFolderStore(workspaceId).then(async db=>{database=db;if(disposed){db.close();return}store.current=db;const [total,list,issues]=await Promise.all([db.count(),db.page(),db.errors()]);if(mounted.current){setCount(total);setRows(list);setErrors(issues);setReady(true);if(total)setStatus('Saved results · reselect the folder to resume')}}).catch(e=>{if(mounted.current)setError(e instanceof Error?e.message:'Local storage unavailable.')});
  return()=>{disposed=true;mounted.current=false;controller.current?.abort();wake.current?.();database?.close();store.current=null};
 },[workspaceId]);
 async function refresh(start=pageStart){const db=store.current;if(!db)return;const [total,list,issues]=await Promise.all([db.count(),db.page(start),db.errors()]);if(mounted.current){setCount(total);setRows(list);setErrors(issues)}}
 async function checkpoint(signal:AbortSignal){signal.throwIfAborted();if(pause.current)await new Promise<void>(resolve=>{wake.current=resolve});wake.current=null;signal.throwIfAborted()}
 function togglePause(){pause.current=!pause.current;setPaused(pause.current);if(!pause.current)wake.current?.()}
 function cancel(){controller.current?.abort();pause.current=false;setPaused(false);wake.current?.()}
 async function scan(files:File[]){
  const db=store.current;if(!db||active.current||!files.length)return;active.current=true;setBusy(true);setScanning(true);setError('');pause.current=false;setPaused(false);const control=new AbortController();controller.current=control;
  setProgress({done:0,total:files.length});let latest=0,lastRefresh=0;
  const refreshProgress=async()=>{if(Date.now()-lastRefresh<1000||!mounted.current)return;lastRefresh=Date.now();await refresh('');setPageStart('');setPages([])};
  const reader=createLocalFolderReader({signal:control.signal,checkpoint:()=>checkpoint(control.signal),progress:message=>{if(mounted.current&&Date.now()-latest>250){latest=Date.now();setStatus(message)}}});
  try{
   for(let index=0;index<files.length;index++){
    await checkpoint(control.signal);const file=files[index],id=folderFileKey(file),name=file.webkitRelativePath||file.name;
    if((await db.file(id))?.status==='done'){setProgress({done:index+1,total:files.length});continue}
    setStatus(name);let found=0;
    try{
     for await(const batch of reader.read(file)){await checkpoint(control.signal);found+=batch.length;await db.add(batch);await refreshProgress()}
     if(!found)throw Error('No contact fields found. Check this file manually.');
     await db.finish({id,name,status:'done',error:'',at:Date.now()});
    }catch(e){
     control.signal.throwIfAborted();if(e instanceof DOMException&&['QuotaExceededError','InvalidStateError','AbortError'].includes(e.name))throw e;
     await db.finish({id,name,status:'error',error:e instanceof Error?e.message:'Could not read this file.',at:Date.now()});
    }
    if(mounted.current){setProgress({done:index+1,total:files.length});await refreshProgress()}
   }
   if(mounted.current)setStatus('Scan complete');
  }catch(e){if(mounted.current){setStatus(control.signal.aborted?'Stopped · saved progress kept':'Scan stopped');if(!control.signal.aborted)setError(e instanceof Error?e.message:'Scan failed.')}}
  finally{await reader.close().catch(()=>{});active.current=false;controller.current=null;if(mounted.current){setBusy(false);setScanning(false);setPaused(false);await refresh('')}}
 }
 async function eachRow(callback:(batch:FolderContact[])=>Promise<void>){
  const db=store.current;if(!db)return;let after='';while(true){const batch=await db.page(after,200);if(!batch.length)break;if(!mounted.current)throw new DOMException('Import window closed.','AbortError');await callback(batch);after=batch[batch.length-1].id}
 }
 async function add(){
  if(active.current)return;active.current=true;setBusy(true);setError('');
  try{await eachRow(async batch=>{onAdd(batch.filter(row=>!row.review||row.approved));await new Promise(resolve=>setTimeout(resolve,0))});if(mounted.current)setStatus('New contacts added · existing matches skipped')}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Import failed.')}
  finally{active.current=false;if(mounted.current)setBusy(false)}
 }
 async function exportCsv(){
  if(active.current)return;active.current=true;setBusy(true);setError('');
  let writable:{write:(value:string)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}|undefined;
  try{
   const picker=(window as SaveWindow).showSaveFilePicker;
   if(picker)writable=await(await picker.call(window,{suggestedName:'pacifica-folder-contacts.csv',types:[{description:'Contacts CSV',accept:{'text/csv':['.csv']}}]})).createWritable();
   const header='\uFEFF'+folderCsvHeader.map(folderCsvCell).join(',')+'\r\n',parts:string[]=[];let size=header.length;
   if(writable)await writable.write(header);else parts.push(header);
   await eachRow(async batch=>{const text=batch.map(folderCsvLine).join('');if(writable)await writable.write(text);else{size+=text.length;if(size>32*1024*1024)throw Error('CSV is too large for this browser. Export with a browser that supports saving directly to a file.');parts.push(text)}});
   if(writable)await writable.close();else downloadContactsCsv(parts.join(''),'pacifica-folder-contacts.csv');
   if(mounted.current)setStatus('CSV exported');
  }catch(e){await writable?.abort().catch(()=>{});if(mounted.current&&!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'Export failed.')}
  finally{active.current=false;if(mounted.current)setBusy(false)}
 }
 async function changePage(next:string,history:string[]){await refresh(next);setPageStart(next);setPages(history)}
 if(!expanded)return <section className="folder-dock" aria-label="Folder scan"><button onClick={onOpen}><strong>{count.toLocaleString()} contacts extracted</strong><small>{busy?status:'Local folder results'}</small></button>{scanning&&<button onClick={togglePause}>{paused?'Resume':'Pause'}</button>}</section>;
 return <section className="folder-panel" aria-label="Local folder contacts"><header><h2>Folder → contacts</h2><button aria-label="Minimize folder scan" onClick={onClose}>−</button></header>
  <small>Local processing · PDF, images, CSV, TSV, TXT, JSON, VCF</small><input ref={node=>{input.current=node;node?.setAttribute('webkitdirectory','');node?.setAttribute('directory','')}} type="file" multiple hidden onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void scan(files)}}/>
  <div className="folder-actions"><button disabled={!ready||busy} onClick={()=>input.current?.click()}>Choose folder</button>{scanning&&<><button onClick={togglePause}>{paused?'Resume':'Pause'}</button><button onClick={cancel}>Stop</button></>}</div>
  <p role="status">{paused?'Paused':status}</p>{progress.total>0&&<><progress aria-label="Folder progress" max={progress.total} value={progress.done}/><small>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} files · {count.toLocaleString()} contacts</small></>}
  {error&&<p role="alert">{error}</p>}
  <div className="folder-actions"><button disabled={busy||!count} onClick={()=>void add()}>Add ready contacts</button><button disabled={busy||!count} onClick={()=>void exportCsv()}>Export CSV</button></div>
  {rows.map(row=><article className="folder-row" key={row.id}><div><strong>{row.name||'Name missing'}</strong><small>{[row.phone,row.email,row.address].filter(Boolean).join(' · ')}</small><small>{row.sourceFile} · {row.sourcePage}</small>{row.review&&!row.approved&&<small>{row.review}</small>}</div>{row.review&&!row.approved&&<button disabled={busy} onClick={()=>void store.current?.approve(row.id).then(()=>refresh()).catch(e=>setError(e.message))}>Approve</button>}</article>)}
  <div className="folder-actions"><button disabled={busy||!pages.length} onClick={()=>void changePage(pages.at(-1)||'',pages.slice(0,-1))}>Previous</button><button disabled={busy||rows.length<50} onClick={()=>void changePage(rows.at(-1)?.id||'',[...pages,pageStart])}>Next</button></div>
  {errors.length>0&&<details><summary>{errors.length.toLocaleString()}{errors.length===100?'+':''} files need attention</summary><ul>{errors.map(file=><li key={file.id}>{file.name}: {file.error}</li>)}</ul>{errors.length===100&&<small>Showing the first 100 files.</small>}</details>}
  <details><summary>Scan details</summary><p>Reads only the selected folder. Documents stay on this device. OCR uses English. Unclear results need approval; existing contacts are skipped. PDF limit: 256 MB per file. Image limit: 64 MB. TXT/JSON/VCF limit: 32 MB. CSV and TSV are read in chunks.</p><p>Keep Pacifica open during the scan. Reselect the same folder to resume after a restart. Results stay in this browser’s local storage until cleared.</p><button disabled={busy||!ready} onClick={()=>void store.current?.clear().then(async()=>{await refresh('');setPageStart('');setPages([]);setProgress({done:0,total:0});setStatus('Local results cleared')}).catch(e=>setError(e.message))}>Clear local results</button></details>
 </section>;
}
