import type {CallDetection} from './call-detection';
export type ScreeningResult=CallDetection & {callSid?:string};
export type ScreeningDecision='wait'|'connect'|'skip-voicemail'|'skip-no-answer'|'skip-busy';
export function screeningDecision(result:ScreeningResult|null,callSid:string,released:boolean):ScreeningDecision{
  if(released||!result||result.callSid!==callSid)return 'wait';
  if(result.humanDetected||result.answeredBy==='human')return 'connect';
  if(result.detectionStatus==='no-answer')return 'skip-no-answer';
  if(result.detectionStatus==='busy')return 'skip-busy';
  if(result.answeredBy==='machine_end_beep')return 'skip-voicemail';
  // Assistants, silence endings, fax and ambiguous machine greetings need a person.
  if(result.answeredBy)return 'connect';
  return 'wait';
}
/** Once released to the agent, no delayed machine result may end this call. */
export function createCallScreening(options:{callSid:()=>string;read:(sid:string)=>Promise<ScreeningResult|null>;connect:()=>void;skip:(outcome:string)=>void;maxWaitMs?:number}){
  let disposed=false,released=false,skipped=false,reading=false,accepted=false;
  let deadline:ReturnType<typeof setTimeout>|undefined;
  function connect(){if(disposed||released||skipped)return;released=true;clearTimeout(deadline);options.connect();}
  async function check(){
    if(disposed||reading||skipped||released)return;
    const sid=options.callSid();if(!sid)return;
    reading=true;
    try{
      const result=await options.read(sid);if(disposed||skipped)return;
      const decision=screeningDecision(result,sid,released);
      if(decision==='connect')connect();
      else if(decision.startsWith('skip-')){skipped=true;clearTimeout(deadline);options.skip(decision==='skip-voicemail'?'Voicemail':decision==='skip-busy'?'Busy':'No answer');}
    }catch{if(accepted)connect();}finally{reading=false;}
  }
  const interval=setInterval(()=>void check(),750);
  return {
    accept(){accepted=true;if(disposed||released||skipped)return;clearTimeout(deadline);deadline=setTimeout(connect,options.maxWaitMs??8000);void check();},
    connect,
    check,
    async ended(){
      // Give final network status a bounded opportunity to arrive. Never infer voicemail.
      for(let i=0;i<3&&!disposed&&!skipped&&!released;i++){await check();if(!skipped&&!released)await new Promise(resolve=>setTimeout(resolve,400));}
      return skipped;
    },
    dispose(){disposed=true;clearInterval(interval);clearTimeout(deadline);},
  };
}
