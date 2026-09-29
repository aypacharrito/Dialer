/** Wall time stays accurate when a browser throttles timers in another tab. */
export function callDurationSeconds(startedAt:number|null|undefined,now=Date.now()){
 return startedAt==null?0:Math.max(0,Math.floor((now-startedAt)/1000));
}

export function formatCallDuration(startedAt:number|null|undefined,now=Date.now()){
 const seconds=callDurationSeconds(startedAt,now);
 return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
}
