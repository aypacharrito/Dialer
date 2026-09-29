/** Parse a nonnegative USD premium without treating missing/invalid values as money. */
export function policyMoney(value:unknown):number|null{
 if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
 if(typeof value!=='string')return null;
 const text=value.trim().replace(/^USD\s*/i,'').replace(/^\$\s*/,'');
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text))return null;
 const number=Number(text.replace(/,/g,''));return Number.isFinite(number)?number:null;
}
