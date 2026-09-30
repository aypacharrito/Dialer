import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('/db/index'))return {url:'data:text/javascript,export function getD1(){return globalThis.testD1}',shortCircuit:true};return next(specifier,context)}});
