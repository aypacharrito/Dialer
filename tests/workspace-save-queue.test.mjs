import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSaveQueue} from '../app/lib/workspace-save-queue.ts';
import * as mobileModule from '../mobile/src/lib/workspace-sync.ts';
// Expo is CommonJS; Node 22 exposes these TypeScript exports under default.
const {applyEdits}=mobileModule.default||mobileModule;

test('slow saves cannot arrive after newer edits and pending snapshots coalesce',async()=>{
  const writes=[];let release;
  const queue=createWorkspaceSaveQueue(async value=>{writes.push(value);if(value==='first')await new Promise(resolve=>{release=resolve});});
  const first=queue.save('first');await new Promise(resolve=>setImmediate(resolve));
  const second=queue.save('second'),third=queue.save('third');
  assert.deepEqual(writes,['first']);release();
  assert.deepEqual(await Promise.all([first,second,third]),[false,false,true]);
  assert.deepEqual(writes,['first','third']);
});

test('a failed save leaves the queue available for the next retry',async()=>{
  let attempts=0;
  const queue=createWorkspaceSaveQueue(async()=>{if(++attempts===1)throw Error('offline')});
  await assert.rejects(queue.save('snapshot'),/offline/);
  assert.equal(await queue.save('snapshot'),true);
});

test('an offline restore needs a newer explicit deletion decision',()=>{
  const workspace={leads:[{id:1,deletedAt:'2026-09-17',deletionUpdatedAt:'2026-09-17'}],profile:{},callLogs:[]};
  assert.equal(applyEdits(workspace,[{leadId:1,patch:{deletedAt:''}}]).leads[0].deletedAt,'2026-09-17');
  assert.equal(applyEdits(workspace,[{leadId:1,patch:{deletedAt:'',deletionUpdatedAt:'2026-09-18'}}]).leads[0].deletedAt,'');
});
