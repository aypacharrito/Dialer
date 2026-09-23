import {registerHooks} from 'node:module';
const sources={
 'ai-provider':`export function aiConfigured(){return Boolean(globalThis.intakeTestAi)} export function aiModel(){return 'test-model'} export function aiReasoning(){return {}} export function aiClient(){return {responses:{create:globalThis.intakeTestAi}}}`,
 'clerk-access':`export async function getPacificaAccess(){return globalThis.intakeTestAccess}`,
 'clerk-config':`export function isClerkConfigured(){return true}`
};
registerHooks({resolve(specifier,context,next){const name=specifier.split('/').at(-1)?.replace(/\.ts$/,'');return sources[name]?{url:'data:text/javascript,'+encodeURIComponent(sources[name]),shortCircuit:true}:next(specifier,context)}});
