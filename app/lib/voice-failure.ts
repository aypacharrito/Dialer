/** Only known per-call failures may advance. Unknown, auth and account errors stop. */
export function voiceFailure(value:unknown){
 const outer=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const inner=outer.twilioError&&typeof outer.twilioError==='object'?outer.twilioError as Record<string,unknown>:outer;
 const code=Number(inner.code)||Number(outer.code)||0;
 const detail=String(inner.message||outer.message||'Phone call failed').replace(/\s+/g,' ').slice(0,320);
 return {message:code?`Phone error ${code}: ${detail}`:detail,advance:[31003,31404,31480,31486,31603].includes(code)};
}
