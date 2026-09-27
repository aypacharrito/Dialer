import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {messagePriority,rankMessageLeads} from '../app/lib/message-priority';
const now=Date.parse('2026-09-26T18:00:00Z');
const leads=Array.from({length:600},(_,i)=>({id:i,name:`Test ${i}`,phone:`818555${String(i).padStart(4,'0')}`,email:'',stage:'New lead',outcome:'Not contacted',followUp:'',importedAt:'2026-09-20T18:00:00Z',lastContact:'Never',sourceDisposition:'Received - not worked yet',doNotCall:false,attempts:0}));
const messages=Array.from({length:3000},(_,i)=>({direction:i%3?'inbound':'outbound-api',from:i%3?leads[(i*37)%600].phone:'8189999999',to:i%3?'8189999999':leads[(i*37)%600].phone,sentAt:new Date(now-i*60000).toISOString()}));
const before=()=>leads.toSorted((a,b)=>{const x=messagePriority(a,messages,'sms',now),y=messagePriority(b,messages,'sms',now);return y.tier-x.tier||y.score-x.score||y.latestAt-x.latestAt||b.id-a.id});
const after=()=>rankMessageLeads(leads,messages,'sms',now);
assert.deepEqual(after().map(x=>x.id),before().map(x=>x.id));
for(const [label,fn] of [['before',before],['after',after]] as const){const samples=[];for(let i=0;i<3;i++){const start=performance.now();fn();samples.push(Number((performance.now()-start).toFixed(2)))}console.log(JSON.stringify({label,contacts:leads.length,messages:messages.length,milliseconds:samples}));}
