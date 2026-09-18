import type {CallDetection} from "./call-detection";

export type ScreeningResult=CallDetection & {callSid?:string};
export type ScreeningDecision="wait"|"skip-no-answer";

export function screeningDecision(result:ScreeningResult|null,callSid:string):ScreeningDecision{
  if(!result||result.callSid!==callSid)return "wait";
  return result.detectionStatus==="no-answer"?"skip-no-answer":"wait";
}

/**
 * Pacifica uses <Dial answerOnBridge="true">.
 *
 * For an outgoing Voice SDK call, the SDK's accept/open transition is therefore
 * the authoritative "the PSTN side answered" signal. That includes humans,
 * voicemail greetings, carrier/Google-style call screening, and IVRs.
 *
 * Never hold answered audio while waiting for a server status callback. The
 * server status endpoint is kept only to confirm a terminal true no-answer
 * before the auto dialer advances.
 */
export function createCallScreening(options:{
  callSid:()=>string;
  read:(sid:string)=>Promise<ScreeningResult|null>;
  connect:()=>void;
  skip:(outcome:string)=>void;
  pollMs?:number;
}){
  let disposed=false,released=false,skipped=false;
  const retryMs=Math.max(150,Number(options.pollMs)||650);

  function connect(){
    if(disposed||released||skipped)return;
    released=true;
    options.connect();
  }

  async function confirmedNoAnswer(){
    if(disposed||released||skipped)return false;
    const sid=options.callSid();
    if(!sid)return false;
    try{
      return screeningDecision(await options.read(sid),sid)==="skip-no-answer";
    }catch{
      return false;
    }
  }

  return {
    // With answerOnBridge=true, accept/open means the destination answered.
    // Release audio synchronously instead of waiting for webhook persistence.
    accept(){connect();},
    connect,
    async ended(){
      if(released||skipped)return skipped;

      // Twilio's child-leg status callback can arrive just after the browser
      // closes. Retry briefly, but only a confirmed no-answer is auto-skipped.
      for(let i=0;i<8&&!disposed&&!skipped&&!released;i++){
        if(await confirmedNoAnswer()){
          skipped=true;
          options.skip("No answer");
          break;
        }
        if(!disposed&&!skipped&&!released){
          await new Promise(resolve=>setTimeout(resolve,Math.min(300,retryMs)));
        }
      }
      return skipped;
    },
    dispose(){disposed=true;},
  };
}