import {registerHooks} from 'node:module';
const sources={
 'clerk-config':`export function isClerkConfigured(){return true}`,
 'clerk-access':`export async function getPacificaAccess(){if(globalThis.workspaceAuthError)throw Error('Private provider details');return globalThis.workspaceAccess||{allowed:true,userId:'tenant',email:'owner@example.test',role:'owner'}}`,
};
registerHooks({resolve(specifier,context,next){
 const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');
 if(sources[name])return {url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true};
 return next(specifier,context);
}});
