import {registerHooks} from 'node:module';
const sources={
 'clerk-access':`export async function getPacificaAccess(){return {allowed:true,userId:'test',role:'owner'}} export async function workspaceAutomationAccess(){return true}`,
 'workspace-storage':`export async function automationWorkspaces(){return [{workspaceId:'test',workspace:globalThis.testWorkspace}]} export async function updateStoredWorkspace(id,update){globalThis.testWorkspace=update(globalThis.testWorkspace);return globalThis.testWorkspace} export async function readStoredWorkspace(){return globalThis.testWorkspace}`,
 'ai-outreach':`export async function personalizeAutomationMessage(input){return input}`,
 'outbound-sms':`export async function outboundSmsStatus(){return {configured:true}} export async function sendOutboundSms(input){globalThis.testDeliveries.push(input);if(input.to.endsWith('0100'))throw Error('Blocked number');const id='SM'+globalThis.testDeliveries.length;return {id,status:'queued',provider:'twilio',communication:{id,providerId:id,channel:'sms',direction:'outbound',body:input.body,status:'queued',sentAt:new Date().toISOString(),provider:'twilio'}}}`,
 'outbound-email':`export function inboundReplyAddress(){return ''} export function outboundEmailStatus(){return {configured:true}} export async function sendOutboundEmail(){throw Error('Email not expected')}`,
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');if(sources[name])return {url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true};return next(specifier,context)}});
