import test from 'node:test';import assert from 'node:assert/strict';
import {GET as list} from '../../app/api/twilio/messages/[sid]/media/route.ts';
import {GET as content} from '../../app/api/twilio/messages/[sid]/media/[mediaSid]/route.ts';
import {GET as archived} from '../../app/api/message-media/[token]/route.ts';
import {archiveMessageFiles} from '../../app/lib/message-media-archive.ts';
import {POST as upload} from '../../app/api/message-media/route.ts';
import {POST as send} from '../../app/api/twilio/messages/route.ts';
const sid='SM'+'1'.repeat(32),mediaSid='ME'+'2'.repeat(32),token='a'.repeat(64);
process.env.TWILIO_ACCOUNT_SID='AC'+'3'.repeat(32);process.env.TWILIO_AUTH_TOKEN='test';
test('MMS metadata and contents require a message belonging to the assigned workspace number',async()=>{
 const original=global.fetch;let foreign=false;
 global.fetch=async url=>String(url).endsWith(`${sid}.json`)?Response.json({from:foreign?'+18185559999':'+18185550100',to:'+18185550200'}):String(url).includes('Media.json')?Response.json({media_list:[{sid:mediaSid,content_type:'image/png'}]}):new Response('image',{headers:{'content-type':'image/png'}});
 try{
  const context={params:Promise.resolve({sid,mediaSid})};const result=await list(new Request('https://example.test'),context);assert.equal(result.status,200);assert.equal((await result.json()).attachments[0].type,'image/png');
  assert.equal((await content(new Request('https://example.test'),context)).status,200);
  foreign=true;assert.equal((await list(new Request('https://example.test'),context)).status,404);assert.equal((await content(new Request('https://example.test'),context)).status,404);
 }finally{global.fetch=original}
});
test('email file history survives public link expiry and is isolated by workspace',async()=>{
 global.mediaStorage=new Map();const record={workspaceId:'owner',name:'quote.pdf',type:'application/pdf',size:4,base64:Buffer.from('test').toString('base64'),expiresAt:Date.now()+10000};global.mediaStorage.set(`pacifica:message-media:v1:${token}`,JSON.stringify(record));
 const files=await archiveMessageFiles('owner',[{path:`https://example.test/api/message-media/${token}`,filename:'quote.pdf',contentType:'application/pdf'}],'https://example.test');assert.match(files[0].url,/history=1/);
 global.mediaStorage.delete(`pacifica:message-media:v1:${token}`);
 const request=new Request(`https://example.test${files[0].url}`),context={params:Promise.resolve({token})};
 assert.equal((await archived(request,context)).status,200);
 global.mediaAccess={allowed:true,userId:'other'};assert.equal((await archived(request,context)).status,404);global.mediaAccess=undefined;
 await assert.rejects(()=>archiveMessageFiles('other',[{path:`https://example.test/api/message-media/${token}`,filename:'quote.pdf',contentType:'application/pdf'}],'https://example.test'));
});
test('inbound voice metadata stays private and audio proxy preserves seeking headers',async()=>{
 const original=global.fetch;let foreign=false,range;
 global.fetch=async(url,options)=>String(url).endsWith(`${sid}.json`)?Response.json({from:foreign?'+18185559999':'+18185550100',to:'+18185550200'}):String(url).includes('Media.json')?Response.json({media_list:[{sid:mediaSid,content_type:'audio/mp4'}]}):(range=options.headers.Range,new Response('2345',{status:206,headers:{'content-type':'audio/mp4','content-range':'bytes 2-5/10','content-length':'4','accept-ranges':'bytes'}}));
 try{const context={params:Promise.resolve({sid,mediaSid})};const metadata=await (await list(new Request('https://crm.test'),context)).json();assert.equal(metadata.attachments[0].name,'Voice-message.m4a');const response=await content(new Request('https://crm.test',{headers:{range:'bytes=2-5'}}),context);assert.equal(range,'bytes=2-5');assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 2-5/10');assert.match(response.headers.get('content-disposition'),/^inline/);foreign=true;assert.equal((await content(new Request('https://crm.test'),context)).status,404)}finally{global.fetch=original}
});
test('voice upload sends an audio-only MMS after explicit Send, archives playback and still blocks opt-outs',async()=>{
 global.mediaStorage=new Map();global.mediaSent=[];global.mediaAccess={allowed:true,userId:'owner',email:'owner@example.test'};global.mediaWorkspace={leads:[{id:1,name:'Contact',phone:'8185550200',smsConsent:true,doNotCall:false}],profile:{}};
 const form=new FormData();form.append('file',new File([new Uint8Array([255,243,72,196])],'Voice-message.mp3',{type:'audio/mpeg'}));form.append('channel','sms');
 const uploaded=await upload(new Request('https://crm.test/api/message-media',{method:'POST',body:form}));assert.equal(uploaded.status,200);const {attachment}=await uploaded.json();assert.equal(attachment.type,'audio/mpeg');assert.equal(mediaSent.length,0);
 const submit=()=>send(new Request('https://crm.test/api/twilio/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({to:'8185550200',body:'',mediaUrls:[attachment.url],permissionDocumented:true,sendMode:'manual'})}));
 const sent=await submit();assert.equal(sent.status,200);const result=await sent.json();assert.equal(result.message.body,'');assert.match(result.message.attachments[0].url,/history=1/);assert.deepEqual(mediaSent[0].mediaUrls,[attachment.url]);assert.equal(mediaSent[0].body,'');
 mediaWorkspace.leads[0].smsOptOut=true;assert.equal((await submit()).status,403);assert.equal(mediaSent.length,1);
 const t=new URL(attachment.url).pathname.split('/').at(-1);mediaStorage.delete(`pacifica:message-media:v1:${t}`);const response=await archived(new Request('https://crm.test'+result.message.attachments[0].url,{headers:{range:'bytes=1-'}}),{params:Promise.resolve({token:t})});assert.equal(response.status,206);assert.match(response.headers.get('content-disposition'),/^inline/);
 const tooLarge=new FormData();tooLarge.append('file',new File([new Uint8Array(450001)],'audio.mp3',{type:'audio/mpeg'}));assert.equal((await upload(new Request('https://crm.test/api/message-media',{method:'POST',body:tooLarge}))).status,413);
 mediaAccess={allowed:true,userId:'other'};assert.equal((await archived(new Request('https://crm.test'+result.message.attachments[0].url),{params:Promise.resolve({token:t})})).status,404);mediaAccess=undefined;
});
