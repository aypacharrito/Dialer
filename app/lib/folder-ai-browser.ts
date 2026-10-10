import {folderAiVersion,folderSectionMatchesIdentity,type FolderAiTarget} from './folder-ai';
import type {FolderContact} from './folder-contact';
import type {FolderStore,FolderAiChunk,FolderTextSection} from './folder-contact-store';

export class FolderAiStop extends Error{}
export async function folderTextHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,'0')).join('')}

type Progress={phase:'identity'|'enrichment';requests:number;input:number;output:number;cached:number;rejected:number};
type Options={store:Pick<FolderStore,'chunk'|'saveChunk'|'saveSection'|'sections'|'page'|'add'>;signal:AbortSignal;checkpoint:()=>Promise<void>;goal:string;model:string;onProgress:(state:Progress)=>void};

export function createFolderAiExtractor(options:Options){
 let phase:Progress['phase']='identity',requests=0,input=0,output=0,cached=0,rejected=0;
 const update=()=>options.onProgress({phase,requests,input,output,cached,rejected});

 async function section(text:string,file:string,page:string,currentPhase:Progress['phase'],targets:FolderAiTarget[]=[]):Promise<FolderContact[]>{
  await options.checkpoint();options.signal.throwIfAborted();if(!text.trim())return [];
  phase=currentPhase;const targetKey=targets.map(target=>target.id).sort().join(',');
  const id=await folderTextHash(JSON.stringify([folderAiVersion,currentPhase,options.model,options.goal,file,page,targetKey,text]));
  let data=await options.store.chunk(id);
  if(data){cached++;update()}else{
   requests++;update();let response:Response;
   try{response=await fetch('/api/ai/folder-contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'ai',phase:currentPhase,text,file,page,goal:options.goal,targets}),signal:options.signal})}catch(error){options.signal.throwIfAborted();throw new FolderAiStop(error instanceof Error?error.message:'AI connection lost. Progress is saved.')}
   const result=await response.json().catch(()=>({}));options.signal.throwIfAborted();
   if(!response.ok){if(result.code==='split_required'&&text.length>1200)data={id,phase:currentPhase,rows:[],more:true,rejected:0,usage:result.usage||{input:0,output:0}};else throw new FolderAiStop(result.error||'AI could not read this section. Progress is saved.')}
   else{if(!Array.isArray(result.rows)||typeof result.more!=='boolean')throw new FolderAiStop('AI returned an invalid result.');data={...result,id,phase:currentPhase} as FolderAiChunk}
   input+=data.usage?.input||0;output+=data.usage?.output||0;
   try{await options.store.saveChunk(data)}catch{throw new FolderAiStop('Could not save AI progress on this device. Scan stopped.')}
   update();
  }
  if(data.more){
   if(text.length<=1200)throw new FolderAiStop('This section contains too much matching information to read safely. Split it into smaller files.');
   const middle=Math.floor(text.length/2),left=await section(text.slice(0,middle+200),file,page,currentPhase,targets),right=await section(text.slice(middle-200),file,page,currentPhase,targets);return [...left,...right];
  }
  rejected+=data.rejected||0;try{await options.store.add(data.rows)}catch{throw new FolderAiStop('Could not save extracted contacts on this device. Scan stopped.')}update();return data.rows;
 }

 async function allTargets(){
  const result:FolderAiTarget[]=[];let after='';
  while(true){const batch=await options.store.page(after,500);if(!batch.length)break;result.push(...batch.map(row=>({id:row.id,name:row.name,phone:row.phone})));after=batch[batch.length-1].id}
  return result;
 }

 return {
  async extract(text:string,file:string,page:string){
   const rows:FolderContact[]=[];
   for(let start=0;start<text.length;start+=10000){
    const part=text.slice(Math.max(0,start-600),start+10000),id=await folderTextHash(JSON.stringify([folderAiVersion,file,page,start,part]));
    const saved:FolderTextSection={id,text:part,file,page};
    try{await options.store.saveSection(saved)}catch{throw new FolderAiStop('Could not save extracted text for the enrichment pass. Scan stopped.')}
    rows.push(...await section(part,file,page,'identity'));
   }
   return rows;
  },
  async enrich(){
   phase='enrichment';update();const targets=await allTargets();if(!targets.length)return [];
   const rows:FolderContact[]=[];let after='';
   while(true){
    await options.checkpoint();options.signal.throwIfAborted();const saved=await options.store.sections(after,50);if(!saved.length)break;
    for(const item of saved){
     await options.checkpoint();options.signal.throwIfAborted();const matched=targets.filter(target=>folderSectionMatchesIdentity(item.text,target));
     for(let start=0;start<matched.length;start+=16)rows.push(...await section(item.text,item.file,item.page,'enrichment',matched.slice(start,start+16)));
    }
    after=saved[saved.length-1].id;
   }
   return rows;
  }
 };
}
