import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('/lib/clerk-access'))return {url:'data:text/javascript,export async function getPacificaAccess(){return {allowed:globalThis.attachmentAllowed!==false,userId:"test"}}',shortCircuit:true};
 if(specifier.endsWith('/lib/workspace-storage'))return {url:'data:text/javascript,export async function readStoredWorkspace(){return globalThis.attachmentWorkspace} export async function updateStoredWorkspace(id,fn){globalThis.attachmentWorkspace=fn(globalThis.attachmentWorkspace);return globalThis.attachmentWorkspace}',shortCircuit:true};
 if(specifier.endsWith('/ai/document-lead/route'))return {url:'data:text/javascript,export async function POST(){globalThis.attachmentCalls++;return Response.json({extraction:{fullName:"Read Name",address:"123 Test Street",otherFields:[]}})}',shortCircuit:true};
 return next(specifier,context);
}});
