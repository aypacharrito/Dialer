/** Local ringback is used only when Twilio reports no carrier early media. */
export function createRingbackTone(){
  let context:AudioContext|undefined;
  let gain:GainNode|undefined;
  let nodes:OscillatorNode[]=[];
  let timer:ReturnType<typeof setInterval>|undefined;
  let wanted=false;
  function stop(){
    wanted=false;
    if(timer)clearInterval(timer);timer=undefined;
    nodes.forEach(node=>{try{node.stop();node.disconnect()}catch{}});nodes=[];
    gain?.disconnect();gain=undefined;
    const previous=context;context=undefined;
    if(previous)void previous.close().catch(()=>undefined);
  }
  async function start(){
    if(wanted||typeof window==="undefined"||!window.AudioContext)return;
    wanted=true;
    try{
      const audio=new window.AudioContext();context=audio;
      if(audio.state==="suspended")await audio.resume();
      if(!wanted||context!==audio)return;
      const volume=audio.createGain();gain=volume;volume.connect(audio.destination);
      const pulse=()=>{const now=audio.currentTime;volume.gain.cancelScheduledValues(now);volume.gain.setValueAtTime(0,now);volume.gain.linearRampToValueAtTime(.06,now+.015);volume.gain.setValueAtTime(.06,now+1.98);volume.gain.linearRampToValueAtTime(0,now+2)};
      nodes=[440,480].map(frequency=>{const node=audio.createOscillator();node.frequency.value=frequency;node.connect(volume);node.start();return node});
      pulse();timer=setInterval(pulse,6000);
    }catch{stop()}
  }
  return {start,stop};
}
