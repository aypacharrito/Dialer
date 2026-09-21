import {registerHooks} from 'node:module';
const sources={
 'phone-assignments':`export async function phoneAssignmentForWorkspace(){return {provider:'twilio',phoneNumber:'+18185550999',smsStatus:'registered'}}`,
 'automated-contact':`export async function assertAutomatedContact(){return {profile:{businessName:'Test Agency'}}}`,
 'clerk-access':`export async function getPacificaAccess(){return {allowed:true,userId:'test',email:'test@example.com'}}`,
 'clerk-config':`export function isClerkConfigured(){return true}`,
 'workspace-storage':`export async function readStoredWorkspace(){return {leads:[{id:1,phone:'8185550100',smsConsent:true}],profile:{}}} export async function updateStoredWorkspace(){}`
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');return sources[name]?{url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true}:next(specifier,context)}});
