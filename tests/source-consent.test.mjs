import test from 'node:test';import assert from 'node:assert/strict';
import {hasContactPermission} from '../app/lib/contact-permission.ts';
import {cleanWorkspaceProfile} from '../app/lib/workspace-profile.ts';
test('David source authorization applies to existing and new source aliases, not Data Axle or manual',()=>{
 const p=cleanWorkspaceProfile({businessName:"David’s Insurance"});
 for(const source of ['Smart Financial','SmartFinancial',"David's Insurance",'https://davidsinsurance.org/auto','Website'])assert.equal(hasContactPermission({source},p,'sms'),true,source);
 for(const source of ['Data Axle','Manual','Other','https://davidsinsurance.org.evil.test'])assert.equal(hasContactPermission({source},p,'sms'),false,source);
 assert.equal(hasContactPermission({source:'SmartFinancial'},cleanWorkspaceProfile({businessName:'Another agency'}),'sms'),false);
});
test('source authorization never overrides opt-outs and owner can remove it',()=>{
 const p=cleanWorkspaceProfile({businessName:"David's Insurance"});
 for(const flags of [{smsOptOut:true},{doNotCall:true},{deletedAt:'2026-09-28'}])assert.equal(hasContactPermission({source:'SmartFinancial',...flags},p,'sms'),false);
 const disabled=cleanWorkspaceProfile({...p,smsConsentSources:[]});assert.equal(hasContactPermission({source:'SmartFinancial'},disabled,'sms'),false);
 assert.equal(hasContactPermission({source:'Manual',smsConsent:true},p,'sms'),true);
});
