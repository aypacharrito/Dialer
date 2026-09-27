import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeIncomingContacts} from '../app/lib/contact-sync.ts';
test('unchanged deletion decisions preserve contact and list identity during polling',()=>{
 const deletedAt='2026-09-20T12:00:00.000Z';const local=[{id:1,phone:'8185550101',deletedAt,deletionUpdatedAt:deletedAt}];
 const result=mergeIncomingContacts(local,structuredClone(local));
 assert.equal(result,local);assert.equal(result[0],local[0]);
 const restored=mergeIncomingContacts(local,[{...local[0],deletedAt:'',deletionUpdatedAt:'2026-09-21T12:00:00.000Z'}]);
 assert.notEqual(restored,local);assert.equal(restored[0].deletedAt,'');
});
