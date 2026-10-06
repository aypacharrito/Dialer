import test from 'node:test';import assert from 'node:assert/strict';
import {housingRecord,searchHousing} from '../app/lib/miner-housing.ts';
import {minerSources,validSearch,cleanInquiry} from '../app/lib/miner-leads.ts';
import {sourceLead} from '../app/lib/miner-prospect-tools.ts';
test('housing signals preserve provenance and cannot turn permits into callable consumer leads',()=>{
 const record=housingRecord({permit_nbr:'123',primary_address:'10 Test St',zip_code:'91401',permit_sub_type:'1 or 2 Family Dwelling',work_desc:'Re-roof',issue_date:'2026-10-01',valuation:'40000',solar:'No'},'roof-solar','home');
 assert.equal(record.name,'10 Test St');assert.equal(record.phone,'');assert.equal(record.fields['Record date'],'2026-10-01');assert.match(record.fields['Record type'],/buying intent are not established/);assert.equal(record.fields['Construction valuation (not home value)'],'40000');
 const lead=sourceLead(record);assert.equal(lead.automationEnabled,false);assert.equal(lead.queueOverride,false);assert.equal(lead.extraFields['Source URL'],record.url);assert.equal(housingRecord({permit_nbr:'bad'},'permits','home'),null);
});
test('housing query uses current schemas, ZIP isolation, residential filters and stable pagination',async()=>{
 const original=globalThis.fetch;try{
  const urls=[];globalThis.fetch=async url=>{urls.push(new URL(url));return Response.json([{permit_nbr:'1',primary_address:'1 Test',zip_code:'91401'},{permit_nbr:'2',primary_address:'2 Test',zip_code:'90210'}])};
  const found=await searchHousing('roof-solar','home','91401',2,new AbortController().signal);assert.equal(found.records.length,1);assert.equal(urls[0].pathname,'/resource/pi9x-tg5x.json');assert.equal(urls[0].searchParams.get('$offset'),'100');assert.match(urls[0].searchParams.get('$where'),/FAMILY/);assert.match(urls[0].searchParams.get('$where'),/ROOF/);
  await searchHousing('occupancy','home','91401',0,new AbortController().signal);assert.match(urls[1].searchParams.get('$where'),/zip_code=91401/);assert.equal(urls[1].searchParams.get('$order'),'cofo_issue_date DESC,cofo_number ASC');
 }finally{globalThis.fetch=original}
});
test('new source options validate categories and do not expose guessed private driver records',()=>{
 for(const source of ['auto-dealers','auto-service','driving-schools'])assert.equal(validSearch(source,'auto','91401',0),true);
 for(const source of ['permits','occupancy','roof-solar','home-trades','home-finance','licensees','all'])assert.equal(validSearch(source,'home','91401',0),true);
 assert.equal(validSearch('occupancy','auto','91401',0),false);assert.equal(validSearch('all','home',"91401 OR 1=1",0),false);assert.equal(minerSources.length,13);
 const input=cleanInquiry({name:'Person',phone:'8185550111',zip:'91401',permission:true},'auto');assert.equal(input.permission,true);
});
test('direct quote requests preserve premium periods and product details without converting general permission into AI consent',()=>{
 const input=cleanInquiry({name:'Driver',phone:'8185550123',zip:'91401',permission:true,carrier:'AAA',premium:'240',premiumPeriod:'Monthly',vehicles:'2',coverage:'Liability + collision/comprehensive',reason:'Compare my renewal'},'auto');
 assert.match(input.details,/Current carrier: AAA/);assert.match(input.details,/Premium period: Monthly/);assert.match(input.details,/Number of vehicles: 2/);assert.equal('aiVoiceConsent' in input,false);
 assert.throws(()=>cleanInquiry({name:'Driver',phone:'8185550123',zip:'91401',permission:true,premiumPeriod:'Fake'},'auto'),/listed/);
});
test('source sweep retains good sources and reports a failed directory without inventing records',async()=>{
 const {searchMinerSource}=await import('../app/lib/miner-sources.ts'),original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{if(String(url).includes('nominatim'))return Response.json([{lat:'34.2',lon:'-118.4'}]);const query=decodeURIComponent(String(options?.body||''));if(query.includes('driving_school'))throw Error('Source down');const service=query.includes('car_repair');return Response.json({elements:[{type:'node',id:service?22:11,tags:{name:service?'Example Auto Repair':'Example Car Dealer',shop:service?'car_repair':'car',phone:service?'8185550112':'8185550111','addr:postcode':'91402'}}]})};
  const found=await searchMinerSource('all','auto','91402');assert.equal(found.partial,true);assert.equal(found.records.length,2);assert.ok(found.sourceStatus.some(s=>!s.available&&/Driving/.test(s.name)));assert.ok(found.records.every(r=>r.url.startsWith('https://www.openstreetmap.org/')));
 }finally{globalThis.fetch=original}
});
