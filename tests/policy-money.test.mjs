import test from 'node:test';import assert from 'node:assert/strict';
import {policyMoney} from '../app/lib/policy-money.ts';
import {clientPolicyMetrics} from '../app/lib/client-portfolio.ts';
import {cleanDocumentLeadExtraction} from '../app/lib/document-lead.ts';
test('declaration premiums retain currency amounts through extraction and portfolio totals',()=>{
 const extraction=cleanDocumentLeadExtraction({policyPremium:'$1,234.56'});assert.equal(extraction.policyPremium,'1234.56');
 assert.equal(clientPolicyMetrics({policyPremium:extraction.policyPremium}).premium,1234.56);
 assert.equal(clientPolicyMetrics({importedFields:{'Total policy premium':'$1,234.56'}}).premium,1234.56);
 assert.equal(policyMoney(0),0);
});
test('missing and invalid premiums are not invented from other digits',()=>{for(const value of ['',undefined,'$1,23.45','-$50','Monthly $50 / total $600','N/A',Infinity])assert.equal(policyMoney(value),null)});
