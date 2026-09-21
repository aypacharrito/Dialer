import type {CallDetection} from "./call-detection";

export type ScreeningResult=CallDetection & {callSid?:string};
export function screeningDecision(result:ScreeningResult|null,callSid:string){
  return result?.callSid===callSid&&result.detectionStatus==="no-answer"?"skip-no-answer":"wait";
}

/** SDK accept/open with answerOnBridge=true releases audio immediately.
 * HTTP status only confirms no-answer; it never gates or mutes a conversation. */
export function createCallScreening(options:{callSid:()=>string;read:(sid:string)=>Promise<ScreeningResult|null>;connect:()=>void;skip:(outcome:string)=>void;pollMs?:number}){
  let disposed=false,released=false,skipped=false,ending:Promise<boolean>|undefined;
  const retryMs=Math.min(300,Math.max(150,options.pollMs||250));
  function connect(){if(disposed||released||skipped)return;released=true;options.connect()}
  async function check(){
    if(disposed||released||skipped)return;
    const sid=options.callSid();if(!sid)return;
    try{
      const result=await options.read(sid);
      if(disposed||released||skipped||sid!==options.callSid())return;
      if(screeningDecision(result,sid)==="skip-no-answer"){skipped=true;options.skip("No answer")}
    }catch{/* Network errors cannot suppress answered audio. */}
  }
  return {
    accept:connect,connect,check,
    ended(){
      ending??=(async()=>{
        for(let i=0;i<8&&!disposed&&!released&&!skipped;i++){
          await check();
          if(i<7&&!disposed&&!released&&!skipped)await new Promise(resolve=>setTimeout(resolve,retryMs));
        }
        return skipped;
      })();
      return ending;
    },
    dispose(){disposed=true},
  };
}
