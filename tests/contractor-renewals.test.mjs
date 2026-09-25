import test from 'node:test';
import assert from 'node:assert/strict';
import {contractorRenewals,contractorCsv} from '../app/lib/contractor-renewals.ts';
import {renewalEvidence} from '../app/lib/client-portfolio.ts';
import {opportunityFor} from '../app/lib/opportunities.ts';
const fields=['LicenseNo','BusinessName','BusinessPhone','PrimaryStatus','County','Classifications(s)','WorkersCompCoverageType','WCInsuranceCompany','WCPolicyNumber','WCEffectiveDate','WCExpirationDate','WCCancellationDate','WCSuspendDate','ExpirationDate','FullBusinessName','MailingAddress','City','State','ZIPCode','LastUpdate'];
const base={LicenseNo:'123456',BusinessName:'Example Plumbing, Inc.',BusinessPhone:'8185550100',PrimaryStatus:'CLEAR',County:'Los Angeles','Classifications(s)':'C36; C10',WorkersCompCoverageType:'Insurance',WCInsuranceCompany:'Example Carrier',WCPolicyNumber:'TEST-1',WCEffectiveDate:'10/01/2025',WCExpirationDate:'10/01/2026',ExpirationDate:'09/26/2026',State:'CA',City:'Van Nuys',ZIPCode:'91405'};
const csv=rows=>[fields,...rows.map(r=>fields.map(f=>r[f]||''))].map(r=>r.map(s=>'"'+s.replace(/"/g,'""')+'"').join(',')).join('\r\n');
const options={counties:'Los Angeles, Ventura',classes:'C36',days:120,snapshot:'2026-09-24'};
const now=new Date(2026,8,25,12);
test('CSLB imports explicit policy expiry, business identity and source evidence without inventing warm intent',async()=>{
 const result=await contractorRenewals(csv([base]),options,now);assert.equal(result.items.length,1);assert.equal(result.items[0].expiration,'2026-10-01');assert.equal(result.items[0].days,6);assert.equal(result.items[0].name,base.BusinessName);
 const out=contractorCsv(result.items);assert.match(out,/CSLB:123456/);assert.match(out,/Policy expiration date/);assert.match(out,/2026-09-24/);assert.doesNotMatch(out,/2026-09-26/);
 const lead={id:1,name:'Example',phone:'8185550100',importedFields:{'Policy expiration date':result.items[0].expiration}};assert.equal(renewalEvidence(lead).date,'2026-10-01');assert.equal(opportunityFor(lead,now.getTime()).warm,false);
});
test('CSLB excludes inactive, exempt, canceled, suspended, out-of-area, invalid date and phone-less rows',async()=>{
 const changes=[{PrimaryStatus:'EXPIRED'},{WorkersCompCoverageType:'Exempt'},{WCCancellationDate:'09/20/2026'},{WCSuspendDate:'09/24/2026'},{County:'Orange'},{WCExpirationDate:'02/30/2027'},{BusinessPhone:''},{WCExpirationDate:''},{'Classifications(s)':'C39'},{WCEffectiveDate:'11/01/2026'}];
 assert.equal((await contractorRenewals(csv(changes.map((x,i)=>({...base,LicenseNo:String(i+1),...x}))),options,now)).items.length,0);
});
test('renewal preview deduplicates licenses and ranks genuine upcoming dates before applying its cap',async()=>{
 const result=await contractorRenewals(csv([{...base,LicenseNo:'1',WCExpirationDate:'12/01/2026'}, {...base,LicenseNo:'2'}, {...base,LicenseNo:'2'}]),{...options,limit:1},now);assert.equal(result.eligible,2);assert.equal(result.items[0].license,'2');
});
test('CSLB rejects wrong file type, incomplete CSV and invalid source dates',async()=>{
 await assert.rejects(contractorRenewals('Name,Phone\nTest,8185550100',options,now),/License Master/);
 await assert.rejects(contractorRenewals(csv([base])+'\r\n"incomplete',options,now),/complete file/);
 await assert.rejects(contractorRenewals(csv([base])+'\r\n1,2',options,now),/incomplete/);
 await assert.rejects(contractorRenewals(csv([base]),{...options,snapshot:'2026-10-01'},now),/source date/);
});
