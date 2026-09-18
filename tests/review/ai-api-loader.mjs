import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('/lib/clerk-access'))return {url:'data:text/javascript,export async function hasPacificaWorkspaceApiAccess(){return globalThis.pacificaTestAccess===true} export async function getPacificaAccess(){return {allowed:globalThis.pacificaTestAccess===true,userId:"test",email:"test@example.com"}}',shortCircuit:true};
 return next(specifier,context);
}});
