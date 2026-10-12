import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuietUpdate} from '../app/lib/quiet-update';

function fixture(){
  let task:(()=>void)|null=null, busy=false, calls:string[]=[], cancelled=0, errors=0, result=true;
  const quiet=createQuietUpdate({isBusy:()=>busy,apply:async target=>{calls.push(target);return result},
    schedule:fn=>{task=fn;return 1},cancel:()=>{task=null;cancelled++},onError:()=>errors++});
  return {quiet,calls,setBusy:(value:boolean)=>busy=value,setResult:(value:boolean)=>result=value,
    fire:async()=>{const fn=task;task=null;fn?.();await new Promise<void>(resolve=>setImmediate(resolve))},
    pending:()=>Boolean(task),cancelled:()=>cancelled,errors:()=>errors};
}
test('quiet updates wait through a call/edit and apply after an idle window',async()=>{
 const f=fixture();f.setBusy(true);f.quiet.offer('web');await f.fire();assert.deepEqual(f.calls,[]);assert.equal(f.pending(),true);
 f.setBusy(false);await f.fire();assert.deepEqual(f.calls,['web']);assert.equal(f.pending(),false);
});
test('owner activity resets the timer and native release takes priority over web refresh',async()=>{
 const f=fixture();f.quiet.offer('web');f.quiet.activity();assert.equal(f.cancelled(),1);
 f.quiet.offer('desktop');f.quiet.offer('web');await f.fire();assert.deepEqual(f.calls,['desktop']);
});
test('unmount/cancellation cannot trigger installation and obsolete web releases withdraw',async()=>{
 const f=fixture();f.quiet.offer('web');f.quiet.withdraw('web');await f.fire();assert.deepEqual(f.calls,[]);
 f.quiet.offer('desktop');f.quiet.stop();await f.fire();assert.deepEqual(f.calls,[]);assert.equal(f.pending(),false);
});
test('native busy rejection is retried rather than reported as installed',async()=>{
 const f=fixture();f.setResult(false);f.quiet.offer('desktop');await f.fire();assert.equal(f.pending(),true);
 f.setResult(true);await f.fire();assert.deepEqual(f.calls,['desktop','desktop']);assert.equal(f.pending(),false);
});
test('installation errors stay visible and do not enter an infinite retry loop',async()=>{
 let task=()=>{},error=0;
 const q=createQuietUpdate({isBusy:()=>false,apply:async()=>{throw Error('installer unavailable')},schedule:fn=>{task=fn;return 1},cancel(){},onError:()=>error++});
 q.offer('desktop');task();await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(error,1);q.stop();
});
