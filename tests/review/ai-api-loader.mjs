import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('/lib/clerk-access'))return {url:'data:text/javascript,export async function hasPacificaWorkspaceApiAccess(){return globalThis.pacificaTestAccess===true}',shortCircuit:true};
 return next(specifier,context);
}});
