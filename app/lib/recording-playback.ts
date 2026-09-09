/** Always use the authenticated workspace proxy, including recordings saved with legacy URLs. */
export function recordingPlaybackPath(sid?:string,url?:string){
  const match=/^RE[a-f0-9]{32}$/i.test(sid||"")?sid:String(url||"").match(/\bRE[a-f0-9]{32}\b/i)?.[0];
  return match?`/api/twilio/recordings?sid=${encodeURIComponent(match)}`:"";
}
