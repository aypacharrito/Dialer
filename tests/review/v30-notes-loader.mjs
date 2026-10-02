import {registerHooks} from 'node:module';
const sources={
 'clerk-access':`export async function getPacificaAccess(){return {allowed:globalThis.noteAllowed!==false,userId:'test',role:'owner'}} export async function workspaceAutomationAccess(){return globalThis.noteAllowed!==false}`,
 'workspace-storage':`export async function listStoredWorkspaces(){return [{workspaceId:'test',workspace:globalThis.noteWorkspace}]} export async function updateStoredWorkspace(id,update){globalThis.noteWorkspace=update(globalThis.noteWorkspace);return globalThis.noteWorkspace} export async function readStoredWorkspace(){return globalThis.noteWorkspace}`,
 'ai-provider':`export const aiConfigured=()=>globalThis.noteConfigured!==false;export const aiModel=()=> 'test-model';export const aiReasoning=()=>({});export const aiProviderIssue=()=>({notice:'AI temporarily unavailable.'});export const aiClient=()=>({responses:{create:async args=>{globalThis.noteCalls.push(args);return globalThis.noteResponse(args)}}})`,
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');if(sources[name])return {url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true};return next(specifier,context)}});
