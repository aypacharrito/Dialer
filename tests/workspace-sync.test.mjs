import test from 'node:test';
import assert from 'node:assert/strict';
import * as mobileModule from '../mobile/src/lib/workspace-sync.ts';
// Expo is CommonJS; Node 22 exposes these TypeScript exports under default.
const {createWorkspaceSync, workspaceCacheKey}=mobileModule.default||mobileModule;
import {mergeIncomingContacts} from '../app/lib/contact-sync.ts';
import {smsRecipients, blocksAiText} from '../app/lib/ai-sms-recipients.ts';
import {refreshAutomation} from '../app/lib/lead-automation.ts';
const lead = {id:1,name:'Carla',phone:'8185550100',stage:'New lead',outcome:'No answer',doNotCall:false,importedAt:'2026-09-01'};
const workspace = leads => ({leads,callLogs:[],profile:{}});
test('refreshes are serialized and an edit cannot be replaced by an older read', async()=>{
 let release; let calls=0; let visible; let saved;
 const sync=createWorkspaceSync({load:async()=>null,save:async s=>{saved=s},publish:s=>{visible=s},get:async()=>{calls++;if(calls===1)await new Promise(r=>{release=r});return workspace([lead,{...lead,id:2}])},put:async()=>{}});
 const first=sync.refresh(); const duplicate=sync.refresh();
 await new Promise(r=>setImmediate(r));
 assert.equal(calls,1);
 const edit=sync.edit({leadId:1,patch:{notes:'Latest edit'}});
 release();await Promise.all([first,duplicate,edit]);
 assert.equal(visible.leads[0].notes,'Latest edit');assert.equal(visible.leads.length,2);assert.equal(saved.pending.length,0);
});
test('offline edits retry as patches without resurrecting deleted records or losing new leads',async()=>{
 let online=false;let saved;let visible;let written;
 const sync=createWorkspaceSync({load:async()=>({workspace:workspace([lead]),pending:[]}),save:async s=>{saved=s},publish:s=>{visible=s},get:async()=>{if(!online)throw Error('offline');return workspace([{...lead,deletedAt:'2026-09-14',deletionUpdatedAt:'2026-09-14'},{...lead,id:2}])},put:async s=>{written=s}});
 await assert.rejects(sync.edit({leadId:1,patch:{notes:'Offline note'}}));assert.equal(saved.pending.length,1);
 online=true;await sync.refresh();assert.equal(written.leads[0].deletedAt,'2026-09-14');assert.equal(visible.leads.length,2);assert.equal(visible.leads[0].notes,'Offline note');
 assert.notEqual(workspaceCacheKey('a'),workspaceCacheKey('b'));
});
test('delayed contact snapshots preserve a delete and locally added leads',()=>{
 const local=[{...lead,deletedAt:'2026-09-14',deletionUpdatedAt:'2026-09-14'},{...lead,id:2,phone:'8185550101'}];
 const merged=mergeIncomingContacts(local,[lead]);assert.equal(merged.length,2);assert.equal(merged[0].deletedAt,'2026-09-14');
});
test('a neutral reply syncs without imposing an interested lock',()=>{
 const replied={...lead,lastInboundAt:'2026-09-14',communications:[{id:'SM1',direction:'inbound',body:'Yes'}]};
 const merged=mergeIncomingContacts([lead],[replied])[0];assert.equal(merged.automationEnabled,undefined);assert.equal(merged.communications.length,1);
 assert.equal(blocksAiText({...lead,communications:replied.communications}),false);
 assert.equal(smsRecipients([replied,{...lead,id:2}]).length,1);
 assert.ok(refreshAutomation(replied).automationNextAt);
});
