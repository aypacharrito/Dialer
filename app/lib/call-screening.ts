import type {CallDetection} from "./call-detection";
export type ScreeningResult=CallDetection & {callSid?:string};
export type ScreeningDecision="wait"|"connect"|"skip-no-answer";

export function screeningDecision(result:ScreeningResult|null,callSid:string,released:boolean):ScreeningDecision{
  if(released||!result||result.callSid!==callSid)return "wait";
  if(result.detectionStatus==="in-progress"||result.detectionStatus==="answered")return "connect";
  if(result.detectionStatus==="no-answer")return "skip-no-answer";
  return "wait";
}

/**
 * Auto dial uses Twilio call-progress status only:
 * - in-progress/answered => release audio
 * - completed alone is only a terminal status; it does not prove an answer
 * - no-answer => skip to next
 * It never interprets AnsweredBy and never auto-skips voicemail/machines.
 */
export function createCallScreening(options:{callSid:()=>string;read:(sid:string)=>Promise<ScreeningResult|null>;connect:()=>void;skip:(outcome:string)=>void;maxWaitMs?:number}){
  let disposed=false,released=false,skipped=false,reading=false;
  function connect(){if(disposed||released||skipped)return;released=true;options.connect();}
  async function check(){
    if(disposed||reading||skipped||released)return;
    const sid=options.callSid();if(!sid)return;
    reading=true;
    try{
      const decision=screeningDecision(await options.read(sid),sid,released);
      if(decision==="connect")connect();
      else if(decision==="skip-no-answer"){skipped=true;options.skip("No answer");}
    }catch{}finally{reading=false}
  }
  const interval=setInterval(()=>void check(),650);
  return {
    accept(){if(disposed||released||skipped)return;void check();},
    connect,
    check,
    async ended(){
      if(released||skipped)return skipped;
      for(let i=0;i<4&&!disposed&&!skipped&&!released;i++){await check();if(!skipped&&!released)await new Promise(resolve=>setTimeout(resolve,300));}
      return skipped;
    },
    dispose(){disposed=true;clearInterval(interval);},
  };
}
