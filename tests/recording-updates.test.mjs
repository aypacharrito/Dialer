import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRecordingUpdates} from '../app/lib/recording-updates.ts';
const call={id:'call-1',callSid:'CA-test',agent:'Test',contact:'Test contact',phone:'2025550100',startedAt:'2026-09-07T12:00:00Z',duration:40,outcome:'Completed'};

test('an unchanged poll preserves the array so it does not trigger autosave',()=>{
 const local=[call];assert.equal(mergeRecordingUpdates(local,[{...call}]),local);
});
test('new recording metadata updates only the matched call and keeps local outcomes',()=>{
 const other={...call,id:'call-2',callSid:'CA-other'};
 const result=mergeRecordingUpdates([call,other],[{...call,outcome:'No answer',recordingSid:'RE-test',recordingStatus:'completed'}]);
 assert.equal(result[0].recordingSid,'RE-test');assert.equal(result[0].outcome,'Completed');assert.equal(result[1],other);
});
test('an older poll does not erase an existing recording or start another save',()=>{
 const local=[{...call,recordingSid:'RE-test',recordingStatus:'completed'}];assert.equal(mergeRecordingUpdates(local,[call]),local);
});
test('matching by call SID avoids a duplicate recording and includes a new recorded call',()=>{
 const result=mergeRecordingUpdates([call],[{...call,id:'remote-id',recordingSid:'RE-test'},{...call,id:'call-3',callSid:'CA-new',recordingSid:'RE-new'}]);
 assert.equal(result.length,2);assert.equal(result[0].id,'call-3');assert.equal(result[1].id,'call-1');assert.equal(result[1].recordingSid,'RE-test');
});
