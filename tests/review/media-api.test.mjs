import test from 'node:test';import assert from 'node:assert/strict';
import {GET as list} from '../../app/api/twilio/messages/[sid]/media/route.ts';
import {GET as content} from '../../app/api/twilio/messages/[sid]/media/[mediaSid]/route.ts';
import {GET as archived} from '../../app/api/message-media/[token]/route.ts';
import {archiveMessageFiles} from '../../app/lib/message-media-archive.ts';
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
