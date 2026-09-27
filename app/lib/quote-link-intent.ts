// The server creates quote tokens; model output never supplies a token or target ID.
export function quoteLinkIntent(prompt:string,leads:Array<{id:number;name:string;phone?:string;deletedAt?:string;doNotCall?:boolean}>):{leadId:number|null}|{error:string}|null{
 if(/\b(don’t|don't|do not|never|stop|cancel)\b/i.test(prompt)||!/\bquote\b/i.test(prompt)||!/\blink\b/i.test(prompt))return null;
 const text=prompt.toLowerCase(),digits=prompt.replace(/\D/g,'');const matches=leads.filter(l=>!l.deletedAt&&!l.doNotCall).filter(l=>{const name=l.name.trim().toLowerCase(),phone=(l.phone||'').replace(/\D/g,'').slice(-10),escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return Boolean(name&&new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,'i').test(text)||phone.length===10&&digits.includes(phone))});
 if(matches.length===1)return {leadId:matches[0].id};if(matches.length>1)return {error:'More than one contact matches. Use Quote requests in the + menu to choose the correct contact.'};if(/\b(general|referral|new prospects?|website|instagram)\b/i.test(text))return {leadId:null};return {error:'Tell me the saved contact’s full name or phone number, or ask for a general quote link.'};
}
