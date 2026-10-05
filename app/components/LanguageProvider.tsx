"use client";
import {createContext,useContext,useEffect,useSyncExternalStore,type ReactNode} from "react";
import {cleanLanguage,languages,translate,type Language} from "../lib/languages";
type Preferences={language:Language;writingLanguage:Language};
type LanguageContext=Preferences&{setLanguage:(value:Language)=>void;setWritingLanguage:(value:Language)=>void;t:(text:string)=>string};
const Context=createContext<LanguageContext>({language:"en",writingLanguage:"en",setLanguage:()=>{},setWritingLanguage:()=>{},t:text=>text});
const preferenceKey="pacifica:languages",changeEvent="pacifica:language-change";
let memory="{}";
function snapshot(){try{return localStorage.getItem(preferenceKey)||memory}catch{return memory}}
function subscribe(callback:()=>void){window.addEventListener(changeEvent,callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener(changeEvent,callback);window.removeEventListener("storage",callback)}}
export function LanguageProvider({children}:{children:ReactNode}){
 const saved=useSyncExternalStore(subscribe,snapshot,()=>"{}");
 let preferences:Partial<Preferences>={};try{preferences=JSON.parse(saved)||{}}catch{}
 const language=cleanLanguage(preferences.language),writingLanguage=cleanLanguage(preferences.writingLanguage);
 useEffect(()=>{document.documentElement.lang=language},[language]);
 function save(next:Language,writing:Language){memory=JSON.stringify({language:next,writingLanguage:writing});try{localStorage.setItem(preferenceKey,memory)}catch{}window.dispatchEvent(new window.Event(changeEvent))}
 return <Context.Provider value={{language,writingLanguage,setLanguage:value=>save(value,writingLanguage),setWritingLanguage:value=>save(language,value),t:text=>translate(text,language)}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export function LanguageSelect({writing=false,disabled=false}:{writing?:boolean;disabled?:boolean}){const {language,writingLanguage,setLanguage,setWritingLanguage,t}=useLanguage();return <label className="language-select"><span>{t(writing?"Writing language":"Language")}</span><select disabled={disabled} aria-label={t(writing?"Writing language":"Language")} value={writing?writingLanguage:language} onChange={event=>(writing?setWritingLanguage:setLanguage)(cleanLanguage(event.target.value))}>{Object.entries(languages).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
