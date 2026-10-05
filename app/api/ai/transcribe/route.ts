import {cleanLanguage} from '../../../lib/languages';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {aiClient,aiConfigured} from '../../../lib/ai-provider';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed)return Response.json({error:'Workspace access required.'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 if(!aiConfigured())return Response.json({error:'Connect your AI account in Settings to use dictation.'},{status:503});
 if(Number(request.headers.get('content-length'))>8*1024*1024)return Response.json({error:'Keep recordings under one minute.'},{status:413});
 try{
  const form=await request.formData(),file=form.get('audio'),language=cleanLanguage(form.get('language'));
  if(!(file instanceof File)||!file.size||file.size>6*1024*1024||!/^audio\/(webm|mp4|ogg|wav|mpeg)(;|$)/i.test(file.type))return Response.json({error:'Record up to one minute of audio.'},{status:400});
  const result=await aiClient().audio.transcriptions.create({file,language,model:process.env.OPENAI_TRANSCRIBE_MODEL||'gpt-4o-mini-transcribe'});
  return Response.json({text:result.text.trim().slice(0,10000)},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Dictation could not finish. Try again or type your message.'},{status:502})}
}
