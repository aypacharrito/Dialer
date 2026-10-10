"use client";

import {useEffect} from "react";

const selector='textarea:not([spellcheck="false"]),input[aria-label*="subject" i]:not([spellcheck="false"])';

function enable(element:Element){
  if(!(element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement))return;
  if(!element.hasAttribute("spellcheck"))element.spellcheck=true;
  if(!element.hasAttribute("autocorrect"))element.setAttribute("autocorrect","on");
  if(!element.hasAttribute("autocapitalize"))element.setAttribute("autocapitalize","sentences");
}

/** Consistent prose correction for drawers and lazily mounted message editors. */
export default function AutocorrectDefaults(){
  useEffect(()=>{
    document.querySelectorAll(selector).forEach(enable);
    const focus=(event:FocusEvent)=>{const target=event.target;if(target instanceof Element&&target.matches(selector))enable(target)};
    document.addEventListener("focusin",focus);
    return()=>document.removeEventListener("focusin",focus);
  },[]);
  return null;
}
