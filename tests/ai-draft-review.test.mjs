import test from 'node:test';import assert from 'node:assert/strict';
import {cleanDraftReview,resolveDraftReview} from '../app/lib/ai-draft-review.ts';
import {defaultWorkspaceProfile as profile} from '../app/lib/workspace-profile.ts';
const leads=Array.from({length:500},(_,i)=>({id:i+1,name:'Contact '+i,phone:'818'+String(5550000+i),email:'person'+i+'@example.test',stage:'Follow-up',smsConsent:true,emailConsent:true}));
test('bulk text selection uses the complete workspace beyond the model sample',()=>{
 const review=resolveDraftReview('do texts for all followups',leads,profile);assert.equal(review.selected.length,500);assert.equal(review.selected.at(-1).id,500);assert.equal(review.channel,'sms');
});
test('draft edits preserve the reviewed subset and a deliberate Clear selection',()=>{
 const previous={channel:'sms',audience:'follow-ups',recipientIds:[2,220,500],text:'My draft'};
 assert.deepEqual(resolveDraftReview('make it shorter',leads,profile,previous).selected.map(l=>l.id),previous.recipientIds);
 assert.deepEqual(resolveDraftReview('make it more friendly',leads,profile,{...previous,recipientIds:[]}).selected,[]);
 assert.deepEqual(resolveDraftReview('make it an email',leads,profile,previous).selected.map(l=>l.id),previous.recipientIds);
});
test('explicit audiences replace prior selection and new exclusions never inherit a bulk send',()=>{
 const previous={channel:'sms',audience:'follow-ups',recipientIds:[2],text:'My draft'};
 assert.equal(resolveDraftReview('texts for all contacts',leads,profile,previous).selected.length,500);
 assert.equal(resolveDraftReview('only text Contact 8',leads,profile,previous).selected.length,1);
 const exclude=resolveDraftReview('exclude Contact 8',leads,profile,previous);assert.equal(exclude.resolved,false);assert.equal(exclude.selected.length,0);
});
test('fresh opt-outs and missing channel permission are removed even from saved selections',()=>{
 const previous={channel:'sms',audience:'custom',recipientIds:[1,2,3],text:'My draft'};
 const now=[{...leads[0],smsOptOut:true},{...leads[1],stage:'Closed'},{...leads[2],smsConsent:false}];assert.equal(resolveDraftReview('shorten this',now,profile,previous).selected.length,0);
 assert.deepEqual(cleanDraftReview({text:'hi',audience:'forged',channel:'sms',recipientIds:[2,'3',NaN]}).recipientIds,[2]);
});
