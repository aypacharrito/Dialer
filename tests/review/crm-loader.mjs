import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/image'||specifier.endsWith('/components/ClerkTopAuth'))return {url:'data:text/javascript,export default function Stub(){return null}',shortCircuit:true};
 return next(specifier,context);
}});
registerHooks({resolve(specifier,context,next){
 if(specifier==='@twilio/voice-sdk')return {url:'data:text/javascript,export class Device extends globalThis.PacificaTestDevice {}',shortCircuit:true};
 return next(specifier,context);
}});
