import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../../app/api/calendar/google/route.ts';
import {GET as callback} from '../../app/api/calendar/google/callback/route.ts';
import {GET as officeGet,POST as office} from '../../app/api/crm/office/route.ts';
import {readCalendarSecret,writeCalendarSecret,withCalendarLock} from '../../app/lib/calendar-vault.ts';
import {calendarScope} from '../../app/lib/google-calendar.ts';
const request=(body,origin='https://crm.test')=>new Request('https://crm.test/api/calendar/google',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
function setup(){
 Object.assign(process.env,{GOOGLE_CALENDAR_CLIENT_ID:'client-test',GOOGLE_CALENDAR_CLIENT_SECRET:'secret-test',GOOGLE_CALENDAR_ENCRYPTION_KEY:'cd'.repeat(32),GOOGLE_CALENDAR_REDIRECT_URI:'https://crm.test/api/calendar/google/callback'});
 globalThis.calendarAccess={allowed:true,role:'owner',accountUserId:'workspace-a',userId:'workspace-a'};
 globalThis.calendarRedis=new Map();globalThis.calendarWorkspaces=new Map([['workspace-a',{leads:[{id:1}],callLogs:[],profile:{},officeItems:[]}],['workspace-b',{leads:[{id:2}],callLogs:[],profile:{}}]]);
 const cookies=new Map();globalThis.calendarCookies={get:name=>cookies.get(name),set:(name,value,options)=>options?.maxAge===0?cookies.delete(name):cookies.set(name,{value})};
 globalThis.fetch=async()=>{throw Error('Unexpected external request')};
}
async function connected(){await writeCalendarSecret('workspace-a',{refreshToken:'private-refresh-token',calendarId:'calendar-test',connectedBy:'workspace-a',events:{},lastSyncAt:'',pending:0,error:''})}
test('Google routes enforce tenant ownership, origin and configuration without leaking credentials',async()=>{
 setup();await connected();const status=await (await GET()).json();assert.equal(status.connected,true);assert.ok(!JSON.stringify(status).includes('private-refresh-token'));assert.ok(![...globalThis.calendarRedis.values()].join('').includes('private-refresh-token'));
 globalThis.calendarAccess={allowed:true,role:'owner',userId:'workspace-b',accountUserId:'workspace-b'};assert.equal((await (await GET()).json()).connected,false);
 globalThis.calendarAccess.role='agent';assert.equal((await POST(request({action:'connect'}))).status,403);
 globalThis.calendarAccess.role='owner';assert.equal((await POST(request({action:'sync'},'https://attacker.test'))).status,403);
 delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;assert.equal((await (await GET()).json()).configured,false);assert.equal((await POST(request({action:'connect'}))).status,503);
 globalThis.calendarAccess.allowed=false;assert.equal((await GET()).status,403);
});
test('OAuth callback rejects changed account, bad state and missing calendar permission',async()=>{
 setup();let result=await (await POST(request({action:'connect'}))).json();let state=new URL(result.url).searchParams.get('state');assert.equal(new URL(result.url).searchParams.get('scope'),calendarScope);
 globalThis.calendarAccess.accountUserId='another-user';assert.match((await callback(new Request(`https://crm.test/api/calendar/google/callback?code=test&state=${state}`))).headers.get('location'),/calendar=failed/);assert.equal(await readCalendarSecret('workspace-a'),null);
 setup();assert.match((await callback(new Request('https://crm.test/api/calendar/google/callback?code=test&state=bad'))).headers.get('location'),/calendar=failed/);
 result=await (await POST(request({action:'connect'}))).json();state=new URL(result.url).searchParams.get('state');globalThis.fetch=async()=>Response.json({access_token:'access-test',refresh_token:'refresh-test',scope:'unrelated'});
 assert.match((await callback(new Request(`https://crm.test/api/calendar/google/callback?code=test&state=${state}`))).headers.get('location'),/calendar=failed/);assert.equal(await readCalendarSecret('workspace-a'),null);
});
test('OAuth creates a separate calendar, stores refresh token privately and prevents callback replay',async()=>{
 setup();const {url}=await (await POST(request({action:'connect'}))).json(),state=new URL(url).searchParams.get('state');let creates=0;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/token'))return Response.json({access_token:'access-test',refresh_token:'refresh-test',scope:calendarScope});assert.equal(url,'https://www.googleapis.com/calendar/v3/calendars');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).summary,'Pacifica CRM');creates++;return Response.json({id:'created-calendar'})};
 const req=new Request(`https://crm.test/api/calendar/google/callback?code=test&state=${state}`);
 assert.match((await callback(req)).headers.get('location'),/calendar=connected/);assert.equal((await readCalendarSecret('workspace-a')).calendarId,'created-calendar');assert.equal(creates,1);
 assert.match((await callback(req)).headers.get('location'),/calendar=failed/);assert.equal(creates,1);
});
test('sync creates once, updates rescheduled events, removes completed events and preserves other workspaces',async()=>{
 setup();await connected();const calls=[];globalThis.fetch=async(url,options)=>{if(String(url).includes('/token'))return Response.json({access_token:'access-test'});calls.push({url,method:options.method,body:options.body&&JSON.parse(options.body)});return options.method==='DELETE'?new Response(null,{status:204}):Response.json({id:'event'})};
 const create={action:'create',leadId:1,kind:'appointment',title:'Meeting',dueAt:'2027-02-01T18:00:00Z',durationMinutes:45,staffReminderMinutes:30};assert.equal((await office(request(create))).status,200);
 let res=await POST(request({action:'sync'}));assert.equal(res.status,200);assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');assert.equal(calls[0].body.reminders.overrides[0].minutes,30);
 await POST(request({action:'sync'}));assert.equal(calls.length,1);
 const item=globalThis.calendarWorkspaces.get('workspace-a').officeItems[0];assert.equal((await office(request({...create,action:'edit',id:item.id,dueAt:'2027-02-02T18:00:00Z'}))).status,200);
 await POST(request({action:'sync'}));assert.equal(calls[1].method,'PATCH');assert.equal(calls[1].body.start.dateTime,'2027-02-02T18:00:00.000Z');
 await office(request({action:'complete',id:item.id}));await POST(request({action:'sync'}));assert.equal(calls[2].method,'DELETE');assert.equal(globalThis.calendarWorkspaces.get('workspace-b').officeItems,undefined);
});
test('overlapping syncs are locked; failed writes retry the same Google event ID',async()=>{
 setup();await connected();let release;const held=withCalendarLock('workspace-a',()=>new Promise(r=>{release=r}));await new Promise(r=>setImmediate(r));assert.equal((await POST(request({action:'sync'}))).status,503);release();await held;
 const body={action:'create',leadId:1,kind:'appointment',title:'Meeting',dueAt:'2027-02-01T18:00:00Z'};await office(request(body));let failures=true;const ids=[];
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/token'))return Response.json({access_token:'access-test'});ids.push(JSON.parse(options.body).id);if(failures)return Response.json({error:'failure'},{status:500});return Response.json({id:ids.at(-1)})};
 assert.equal((await POST(request({action:'sync'}))).status,503);assert.match((await (await GET()).json()).error,/500/);failures=false;assert.equal((await POST(request({action:'sync'}))).status,200);assert.equal(ids[0],ids[1]);
});
test('calendar edits validate reminder choices and preserve item identity; disconnect clears only this tenant',async()=>{
 setup();const body={action:'create',leadId:1,kind:'appointment',title:'Meeting',dueAt:'2027-02-01T18:00:00Z'};
 assert.equal((await office(request({...body,staffReminderMinutes:999}))).status,400);assert.equal((await office(request({...body,durationMinutes:-3}))).status,400);assert.equal((await office(request(body))).status,200);
 const item=globalThis.calendarWorkspaces.get('workspace-a').officeItems[0];assert.equal((await office(request({...body,action:'edit',id:item.id,staffReminderMinutes:-1}))).status,200);assert.equal(globalThis.calendarWorkspaces.get('workspace-a').officeItems[0].id,item.id);
 await connected();await writeCalendarSecret('workspace-b',{refreshToken:'other'});assert.equal((await POST(request({action:'disconnect'}))).status,200);assert.equal(await readCalendarSecret('workspace-a'),null);assert.equal((await readCalendarSecret('workspace-b')).refreshToken,'other');
});


test('personal appointments need no contact, cannot text customers, and deleted contacts stop appearing in reminders',async()=>{
 setup();const body={action:'create',leadId:0,kind:'appointment',title:'Personal meeting',dueAt:'2027-02-01T18:00:00Z'};
 assert.equal((await office(request(body))).status,200);
 assert.equal((await office(request({...body,reminderState:'pending',reminderAt:'2027-02-01T17:00:00Z'}))).status,400);
 assert.equal((await office(request({...body,leadId:1}))).status,200);
 globalThis.calendarWorkspaces.get('workspace-a').leads[0].deletedAt='2026-09-25T00:00:00Z';
 const items=(await (await officeGet()).json()).items;assert.equal(items.length,1);assert.equal(items[0].leadId,0);
});
