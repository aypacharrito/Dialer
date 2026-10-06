import {registerHooks} from 'node:module';
const sources={
 'clerk-access':`export const getPacificaAccess=async()=>globalThis.voiceHarness.access;`,
 'workspace-storage':`export const readStoredWorkspace=async()=>structuredClone(globalThis.voiceHarness.workspace);export async function updateStoredWorkspace(id,fn){if(id!=='test')throw Error('Wrong workspace');const value=fn(structuredClone(globalThis.voiceHarness.workspace));globalThis.voiceHarness.workspace=value;return structuredClone(value)}`,
 'phone-assignments':`export const phoneAssignmentForWorkspace=async()=>({provider:'twilio',phoneNumber:'+18185550999'});export const phoneAssignmentForClient=async()=>null;export const phoneAssignmentForNumber=async()=>null;`,
 'twilio-webhook':`export const validateTwilioWebhook=async()=>true;export const rejectedTwilioWebhook=()=>new Response('Forbidden',{status:403});`,
};
registerHooks({resolve(specifier,context,next){const source=sources[specifier.split('/').at(-1)?.replace(/\.ts$/,'')];return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context)}});
