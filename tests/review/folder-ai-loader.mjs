import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('/lib/clerk-access'))return {url:'data:text/javascript,export async function getPacificaAccess(){return globalThis.folderHarness.access}',shortCircuit:true};
 if(specifier==='openai')return {url:'data:text/javascript,export default class OpenAI{responses={create:async(...args)=>{globalThis.folderHarness.calls.push(args);if(globalThis.folderHarness.error)throw globalThis.folderHarness.error;return globalThis.folderHarness.response}}}',shortCircuit:true};
 return next(specifier,context);
}});
