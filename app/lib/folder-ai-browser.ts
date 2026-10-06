import {folderAiVersion} from './folder-ai';
import type {FolderContact} from './folder-contact';
import type {FolderStore,FolderAiChunk} from './folder-contact-store';
export class FolderAiStop extends Error{}
export async function folderTextHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,'0')).join('')}
type Options={store:Pick<FolderStore,'chunk'|'saveChunk'|'add'>;signal:AbortSignal;checkpoint:()=>Promise<void>;goal:string;model:string;maxRequests:number;onProgress:(state:{requests:number;input:number;output:number;cached:number;rejected:number})=>void};
export function createFolderAiExtractor(options:Options){
 let requests=0,input=0,output=0,cached=0,rejected=0;const limit=Math.max(1,Math.min(500,Math.floor(options.maxRequests)||25));
 const update=()=>options.onProgress({requests,input,output,cached,rejected});
 async function section(text:string,file:string,page:string):Promise<FolderContact[]>{
  await options.checkpoint();options.signal.throwIfAborted();if(!text.trim())return [];
  const id=await folderTextHash(JSON.stringify([folderAiVersion,options.model,options.goal,file,page,text]));
  let data=await options.store.chunk(id);
  if(data){cached++;update()}else{
   if(requests>=limit)throw new FolderAiStop('AI scan limit reached. Progress is saved; start another pass to continue.');
   requests++;update();let response:Response;
   try{response=await fetch('/api/ai/folder-contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'ai',text,file,page,goal:options.goal}),signal:options.signal})}catch(error){options.signal.throwIfAborted();throw new FolderAiStop(error instanceof Error?error.message:'AI connection lost. Progress is saved.')}
   const result=await response.json().catch(()=>({}));options.signal.throwIfAborted();
   if(!response.ok){if(result.code==='split_required'&&text.length>1200)data={id,rows:[],more:true,rejected:0,usage:result.usage||{input:0,output:0}};else throw new FolderAiStop(result.error||'AI could not read this section. Progress is saved.')}
   else{if(!Array.isArray(result.rows)||typeof result.more!=='boolean')throw new FolderAiStop('AI returned an invalid result.');data={...result,id} as FolderAiChunk}
   input+=data.usage?.input||0;output+=data.usage?.output||0;
   try{await options.store.saveChunk(data)}catch{throw new FolderAiStop('Could not save AI progress on this device. Scan stopped.')}
   update();
  }
  if(data.more){
   if(text.length<=1200)throw new FolderAiStop('This section contains too many contacts to read safely. Split it into smaller files.');
   const middle=Math.floor(text.length/2),left=await section(text.slice(0,middle+200),file,page),right=await section(text.slice(middle-200),file,page);return [...left,...right];
  }
  rejected+=data.rejected||0;try{await options.store.add(data.rows)}catch{throw new FolderAiStop('Could not save extracted contacts on this device. Scan stopped.')}update();return data.rows;
 }
 return {async extract(text:string,file:string,page:string){
  const rows:FolderContact[]=[];for(let start=0;start<text.length;start+=10000){const part=text.slice(Math.max(0,start-600),start+10000);rows.push(...await section(part,file,page))}return rows;
 }};
}
