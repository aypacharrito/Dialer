import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {cleanInquiry,csvRecords,cleanMinerState,validSearch} from '../app/lib/miner-leads.ts';
import {directoryCsv,licenseRecord,parcelRecord} from '../app/lib/miner-sources.ts';
import {accountAllows,scopeAllows,isSessionApi,managedAccessState} from '../app/lib/account-access-policy.ts';
test('permanent and time-limited grants keep pause and expiry authoritative',()=>{
 assert.equal(managedAccessState({pacificaManaged:true,pacificaPermanentAccess:true,pacificaTrialEndsAt:'2000-01-01'}),'permanent');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaPermanentAccess:true,pacificaAccessPaused:true}),'paused');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaTrialEndsAt:'2000-01-01'}),'expired');
 assert.equal(managedAccessState({pacificaManaged:true,pacificaTrialEndsAt:'2099-01-01'}),'trial');
});
test('limited scopes protect writes, calling, billing-adjacent admin and OAuth actions',()=>{
 for(const path of ['/api/crm/workspace','/api/email/messages','/api/twilio/token','/api/team/members','/api/admin/accounts','/api/calendar/google'])assert.equal(scopeAllows('miner-only',path,'POST'),false,path);
 assert.equal(scopeAllows('miner-only','/api/miner/prospects','POST','import'),true);
 for(const action of ['import','save-search','run-search','csv-import'])assert.equal(scopeAllows('read-only','/api/miner/prospects','POST',action),false);
 for(const action of ['search','analyze','csv-preview'])assert.equal(scopeAllows('read-only','/api/miner/prospects','POST',action),true);
 assert.equal(scopeAllows('read-only','/api/calendar/google/callback','GET'),false);
 assert.equal(scopeAllows('read-only','/api/twilio/token','GET'),false);
 assert.equal(accountAllows({accessMetadata:{pacificaAccessScope:'full'},memberMetadata:{pacificaAccessScope:'read-only'}},'/api/miner/campaigns','POST'),false);
 for(const path of ['/api/lead-capture','/api/quote-intake','/api/twilio/messages/status','/api/email/webhook','/api/message-media/token','/api/email/media/token'])assert.equal(isSessionApi(path),false,path);
 assert.equal(isSessionApi('/api/twilio/status','POST'),false);assert.equal(isSessionApi('/api/integrations/leads','POST'),false);assert.equal(isSessionApi('/api/integrations/dispositions','POST'),true);
 for(const path of ['/api/miner/prospects','/api/crm/workspace','/api/admin/accounts'])assert.equal(isSessionApi(path),true,path);
});
test('inquiries require usable contact information and explicit response permission',()=>{
 assert.throws(()=>cleanInquiry({name:'Person',phone:'8185550123',zip:'91401'},'home'),/Confirm/);
 assert.throws(()=>cleanInquiry({name:'Person',phone:'fake',zip:'91401',permission:true},'auto'),/valid/);
 const item=cleanInquiry({name:'Person',phone:'+1 (818) 555-0123',zip:'91401',permission:true},'real-estate');assert.equal(item.phone,'8185550123');assert.equal(item.kind,'real-estate');
 assert.throws(()=>cleanInquiry({name:'Person',email:'a@example.com',zip:'91401 OR 1=1',permission:true},'commercial'),/ZIP/);
});
test('CSV quoting and public sources preserve facts without inventing consumer contacts',()=>{
 assert.deepEqual(csvRecords('Name,Address,Notes\r\n"A, LLC","123 Main","First line\nSecond ""quoted"" line"'),[{name:'A, LLC',address:'123 Main',notes:'First line\nSecond "quoted" line'}]);
 assert.throws(()=>csvRecords('Name\n"bad'),/unclosed/);
 const parcel=parcelRecord({AIN:'123',SitusFullAddress:'123 Test St',SitusZIP:'91401-1111',UseDescription:'Single',YearBuilt1:'1960',Roll_LandValue:500000},'home');assert.equal(parcel.phone,'');assert.equal(parcel.name,'123 Test St');assert.match(parcel.fields['Record type'],/owner identity.*unavailable/);assert.equal(parcel.fields['Assessed land value (not market value)'],'500000');
 const record=licenseRecord({licstatus:'Licensed',licnumber:'009876',lastnameprimary:'Example Realty',zipcode:'91401',address1:'2 Test Rd'},'real-estate');assert.equal(record.name,'Example Realty');assert.equal(record.phone,'');assert.equal(licenseRecord({licstatus:'Expired',licnumber:'123'},'real-estate'),null);
 assert.equal(validSearch('parcels','auto','91401',0),false);assert.equal(validSearch('parcels','home','91401',0),true);assert.equal(validSearch('city','commercial',"91401'",0),false);
 assert.deepEqual(cleanMinerState(null),{campaigns:[],inquiries:[],searches:[]});
});
test('directory parser accepts only the expected bounded CSV entry',()=>{
 const data=Buffer.from('a,b\n1,2'),deflated=deflateRawSync(data),name=Buffer.from('CurrList.csv'),head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(8,8);head.writeUInt32LE(deflated.length,18);head.writeUInt16LE(name.length,26);
 assert.equal(directoryCsv(Buffer.concat([head,name,deflated])),data.toString());assert.throws(()=>directoryCsv(Buffer.from('not a zip')),/format/);assert.throws(()=>directoryCsv(Buffer.concat([head,Buffer.from('BadNames.csv'),deflated])),/incomplete/);
});
