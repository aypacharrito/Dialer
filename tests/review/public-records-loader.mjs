import {registerHooks} from 'node:module';
const sources={
 'clerk-config':`export function isClerkConfigured(){return true}`,
 'clerk-access':`export async function getPacificaAccess(){return globalThis.recordsAccess ?? {allowed:true,userId:'owner',role:'owner'}}`,
 'workspace-storage':`export async function readStoredWorkspace(){return globalThis.recordsWorkspace} export async function updateStoredWorkspace(id,fn){globalThis.recordsWorkspace=fn(globalThis.recordsWorkspace);return globalThis.recordsWorkspace} export async function listStoredWorkspaces(){return []}`,
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');if(sources[name])return {url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true};return next(specifier,context)}});
