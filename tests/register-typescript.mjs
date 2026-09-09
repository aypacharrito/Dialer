import {registerHooks} from 'node:module';
import fs from 'node:fs';
import ts from 'typescript';
registerHooks({
 resolve(specifier,context,next){try{return next(specifier,context)}catch(error){if(specifier.startsWith('.')&&context.parentURL){for(const ext of ['.ts','.tsx']){const url=new URL(specifier+ext,context.parentURL);if(fs.existsSync(url))return {url:url.href,shortCircuit:true}}}throw error}},
 load(url,context,next){if(/\.tsx?$/.test(url)&&!url.includes('/node_modules/'))return {format:'module',source:ts.transpileModule(fs.readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context)}
});
