import {registerHooks} from 'node:module';
import {JSDOM} from 'jsdom';
// React and Clerk inspect DOM input support when first imported. Initialize a
// browser before that happens; individual tests replace it with their own DOM.
const bootstrap=new JSDOM('',{url:'https://example.test',pretendToBeVisual:true});
Object.assign(globalThis,{window:bootstrap.window,document:bootstrap.window.document});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:bootstrap.window.navigator});
registerHooks({resolve(specifier,context,next){
 if(specifier==='@clerk/nextjs')return {url:'data:text/javascript,export const useUser=()=>({user:null,isLoaded:true}),useClerk=()=>({signOut:async()=>{}});export function UserButton(){return null}',shortCircuit:true};
 if(specifier.endsWith('.module.css'))return {url:'data:text/javascript,export default {}',shortCircuit:true};
 if(specifier==='next/image'||specifier.endsWith('/components/ClerkTopAuth'))return {url:'data:text/javascript,export default function Stub(){return null}',shortCircuit:true};
 return next(specifier,context);
}});
registerHooks({resolve(specifier,context,next){
 if(specifier==='@twilio/voice-sdk')return {url:'data:text/javascript,export class Device extends globalThis.PacificaTestDevice {}',shortCircuit:true};
 return next(specifier,context);
}});
