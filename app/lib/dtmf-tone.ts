const DTMF_FREQUENCIES:Record<string,readonly [number,number]>={
  "1":[697,1209],"2":[697,1336],"3":[697,1477],
  "4":[770,1209],"5":[770,1336],"6":[770,1477],
  "7":[852,1209],"8":[852,1336],"9":[852,1477],
  "*":[941,1209],"0":[941,1336],"#":[941,1477],
};

export function dialToneFrequencies(key:string){return DTMF_FREQUENCIES[key]}

let sharedContext:AudioContext|null=null;

export async function playDialTone(key:string,durationMs=105){
  const frequencies=dialToneFrequencies(key);
  if(!frequencies||typeof window==="undefined")return false;
  const AudioContextClass=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioContextClass)return false;
  try{
    sharedContext??=new AudioContextClass();
    if(sharedContext.state==="suspended")await sharedContext.resume();
    const startedAt=sharedContext.currentTime;
    const endsAt=startedAt+Math.max(55,Math.min(220,durationMs))/1000;
    const gain=sharedContext.createGain();
    gain.gain.setValueAtTime(.0001,startedAt);
    gain.gain.exponentialRampToValueAtTime(.075,startedAt+.008);
    gain.gain.setValueAtTime(.075,Math.max(startedAt+.009,endsAt-.025));
    gain.gain.exponentialRampToValueAtTime(.0001,endsAt);
    gain.connect(sharedContext.destination);
    for(const frequency of frequencies){
      const oscillator=sharedContext.createOscillator();
      oscillator.type="sine";
      oscillator.frequency.setValueAtTime(frequency,startedAt);
      oscillator.connect(gain);
      oscillator.start(startedAt);
      oscillator.stop(endsAt+.01);
    }
    return true;
  }catch{return false}
}
