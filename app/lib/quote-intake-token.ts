import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
function key(){
 const secret=process.env.QUOTE_INTAKE_SECRET||process.env.CLERK_SECRET_KEY||"";
 if(secret.length<32)throw Error("Secure quote links need a configured Clerk secret or QUOTE_INTAKE_SECRET (at least 32 characters).");
 return createHash("sha256").update(`pacifica:quote-intake:v1:${secret}`).digest();
}
export function createQuoteToken(workspaceId:string,linkId:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 const data=Buffer.concat([cipher.update(JSON.stringify({workspaceId,linkId}),'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');
}
export function readQuoteToken(token:string):{workspaceId:string;linkId:string}{
 if(!/^[A-Za-z0-9_-]{40,1000}$/.test(token))throw Error('This quote link is invalid or expired.');
 try{
  const bytes=Buffer.from(token,'base64url'),cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));
  const value=JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
  if(typeof value.workspaceId!=='string'||typeof value.linkId!=='string')throw Error('Invalid payload');return value;
 }catch{throw Error('This quote link is invalid or expired.')}
}
