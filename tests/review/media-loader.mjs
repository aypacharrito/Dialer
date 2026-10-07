import {registerHooks} from 'node:module';
const sources={
 'clerk-access':`export async function getPacificaAccess(){return globalThis.mediaAccess||{allowed:true,userId:'owner',email:'owner@example.test'}}`,
 'clerk-config':`export function isClerkConfigured(){return true}`,
 'phone-assignments':`export async function phoneAssignmentForWorkspace(){return {provider:'twilio',phoneNumber:'+18185550100'}}`,
 'workspace-storage':`export function workspaceRedisConfig(){return {url:'configured'}} export async function readStoredWorkspace(){return globalThis.mediaWorkspace} export async function updateStoredWorkspace(_id,update){return globalThis.mediaWorkspace=update(globalThis.mediaWorkspace)} export async function workspaceRedis([op,key,value]){if(op==='GET')return globalThis.mediaStorage.get(key)||null;if(op==='SET'){globalThis.mediaStorage.set(key,value);return 'OK'}}`,
 'outbound-sms':`export async function outboundSmsStatus(){return {configured:true}} export async function sendOutboundSms(input){globalThis.mediaSent.push(input);return {id:'SM'+'4'.repeat(32),from:'+18185550100',status:'queued',historySaved:true,communication:{body:input.body}}}`,
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');return sources[name]?{url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true}:next(specifier,context)}});
