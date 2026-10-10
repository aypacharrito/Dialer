import {contactsFromText,contactsFromVcard,folderContact,folderCsvRows,type FolderContact} from './folder-contact';
import {bestDocumentExtraction} from './local-document-parser';
type Options={extract?:(text:string,file:string,page:string)=>Promise<FolderContact[]>;signal:AbortSignal;checkpoint:()=>Promise<void>;progress:(message:string)=>void};
async function* chunks(file:File,options:Options){
 const reader=file.stream().getReader(),decoder=new TextDecoder();
 try{while(true){await options.checkpoint();const result=await reader.read();if(result.done)break;yield decoder.decode(result.value,{stream:true})}yield decoder.decode()}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
function documentContacts(text:string,name:string,page:string){
 const labeled=contactsFromText(text,name,page);if(labeled.length)return labeled;
 const parsed=bestDocumentExtraction(text);
 const row=folderContact({...parsed,name:parsed.fullName||[parsed.firstName,parsed.middleName,parsed.lastName].filter(Boolean).join(' ')},name,page,'Check extracted document details');
 return row?[row]:[];
}
/** Local bytes only. Dynamic imports load bundled parsers, never a document API. */
export function createLocalFolderReader(options:Options){
 const extract=(text:string,name:string,page:string)=>options.extract?options.extract(text,name,page):Promise.resolve(documentContacts(text,name,page));
 let worker:import('tesseract.js').Worker|undefined;
 const abort=()=>{void worker?.terminate();worker=undefined};
 options.signal.addEventListener('abort',abort,{once:true});
 async function ocr(image:File|HTMLCanvasElement){
  await options.checkpoint();
  if(!worker){const {createWorker}=await import('tesseract.js');const created=await createWorker('eng',1,{workerPath:'/scanner/tesseract-worker.min.js',langPath:'/scanner',corePath:'/scanner/tesseract-core',logger:e=>{if(e.status==='recognizing text')options.progress('Reading image · '+Math.round((e.progress||0)*100)+'%')}});
   if(options.signal.aborted){await created.terminate();options.signal.throwIfAborted()}worker=created;
  }
  const result=await worker!.recognize(image);await options.checkpoint();return result.data.text;
 }
 async function* read(file:File):AsyncGenerator<FolderContact[]>{
  const name=file.webkitRelativePath||file.name,extension=file.name.split('.').pop()?.toLowerCase();
  await options.checkpoint();
  if(extension==='csv'||extension==='tsv'){
   let headers:string[]|undefined,index=0,batch:FolderContact[]=[],aiRows:string[][]=[];let batchStart=2;
   for await(const row of folderCsvRows(chunks(file,options),extension==='tsv'?'\t':',')){
    await options.checkpoint();if(!headers){headers=row.map(h=>h.replace(/^\uFEFF/,''));continue}index++;
    if(row.length!==headers.length)throw Error('CSV row '+(index+1)+' has a different number of columns.');
    if(options.extract){aiRows.push(row);if(aiRows.length>=10){yield await extract(JSON.stringify({columns:headers,rows:aiRows}),name,'Rows '+batchStart+'–'+(index+1));aiRows=[];batchStart=index+2}continue}
    const contact=folderContact(Object.fromEntries(headers.map((h,i)=>[h,row[i]])),name,'Row '+(index+1));if(contact)batch.push(contact);
    if(batch.length>=100){yield batch;batch=[]}
   }if(aiRows.length)yield await extract(JSON.stringify({columns:headers,rows:aiRows}),name,'Rows '+batchStart+'–'+(index+1));if(batch.length)yield batch;return;
  }
  if(extension==='pdf'){
   if(file.size>256*1024*1024)throw Error('PDF exceeds 256 MB; split this file into smaller PDFs.');
   const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/scanner/pdf.worker.min.mjs';
   const source={data:new Uint8Array(await file.arrayBuffer())};Object.assign(source,{isEvalSupported:false});
   const task=pdfjs.getDocument(source);
   const cancel=()=>{void task.destroy()};options.signal.addEventListener('abort',cancel,{once:true});
   try{const pdf=await task.promise;let previousPage='',readable=false;for(let n=1;n<=pdf.numPages;n++){
    await options.checkpoint();options.progress('Page '+n+' / '+pdf.numPages);const page=await pdf.getPage(n);
    try{
     const content=await page.getTextContent();let text=content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
     if(text.replace(/\s/g,'').length<40){
      const base=page.getViewport({scale:1}),scale=Math.min(2,2600/Math.max(base.width,base.height)),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d');if(!context)throw Error('Image canvas unavailable.');
      try{await page.render({canvas,canvasContext:context,viewport}).promise;text=await ocr(canvas)}finally{canvas.width=0;canvas.height=0}
     }
     if(!text.trim()){previousPage='';continue}readable=true;
     const rows=await extract(options.extract&&previousPage?previousPage+'\n'+text:text,name,options.extract&&previousPage?'Pages '+(n-1)+'–'+n:'Page '+n);previousPage=text.slice(-1000);if(rows.length)yield rows;
    }finally{page.cleanup()}
   }if(!readable)throw Error('No readable text found. Check this document manually.')}finally{options.signal.removeEventListener('abort',cancel);await task.destroy()}return;
  }
  if(['png','jpg','jpeg','webp','bmp','tif','tiff'].includes(extension||'')){
   if(file.size>64*1024*1024)throw Error('Image exceeds 64 MB.');
   const bitmap=await createImageBitmap(file);
   try{const scale=Math.min(1,2600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    try{const context=canvas.getContext('2d');if(!context)throw Error('Image canvas unavailable.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);const text=await ocr(canvas);if(!text.trim())throw Error('No readable text found. Check this image manually.');const rows=await extract(text,name,'Image');if(rows.length)yield rows}finally{canvas.width=0;canvas.height=0}
   }finally{bitmap.close()}return;
  }
  if(!['txt','md','log','json','vcf'].includes(extension||''))throw Error('Unsupported format. Use PDF, images, CSV, TSV, TXT, MD, LOG, JSON or VCF.');
  if(file.size>32*1024*1024)throw Error('Text file exceeds 32 MB; convert large tables to CSV.');
  const text=await file.text();await options.checkpoint();
  if(!text.trim())throw Error('No readable text found. This file is empty.');
  if(options.extract){yield await extract(text,name,'Text');return}
  if(extension==='vcf'){yield contactsFromVcard(text,name);return}
  if(extension==='json'){
   const data:unknown=JSON.parse(text),records=Array.isArray(data)?data:data&&typeof data==='object'&&Array.isArray((data as {contacts?:unknown}).contacts)?(data as {contacts:unknown[]}).contacts:[data];
   for(let start=0;start<records.length;start+=100){await options.checkpoint();yield records.slice(start,start+100).flatMap((record,index)=>{if(!record||typeof record!=='object'||Array.isArray(record))return [];const contact=folderContact(record as Record<string,unknown>,name,'Record '+(start+index+1));return contact?[contact]:[]})}return;
  }
  yield await extract(text,name,'Text');
 }
 return {read,async close(){options.signal.removeEventListener('abort',abort);const active=worker;worker=undefined;await active?.terminate()}};
}
