import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier==='openai')return {url:'data:text/javascript,export default class OpenAI{constructor(options){globalThis.scanOptions=options;this.responses={create:async input=>{globalThis.scanCalls.push(input);return {output_text:JSON.stringify(globalThis.scanReads.shift())}}}}}',shortCircuit:true};
 if(specifier.endsWith('/lib/clerk-access'))return {url:'data:text/javascript,export async function hasPacificaWorkspaceApiAccess(){return true}',shortCircuit:true};return next(specifier,context)
}});
