import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='@twilio/voice-sdk'?{url:'data:text/javascript,export class Device { constructor(...args) { return new globalThis.voiceBrowser.Device(...args) } }',shortCircuit:true}:next(specifier,context)}});
