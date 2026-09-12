import test from 'node:test';
import assert from 'node:assert/strict';
import {leadVehicles} from '../app/lib/lead-vehicles.ts';
import {quoteReadiness} from '../app/lib/quote-readiness.ts';
import {extraFields} from '../app/lib/provider-quote-fields.ts';
const vin='1HGCM82633A004352';
const second='1HGCM82633A004353';
test('website and provider indexed vehicles survive storage and render separately',()=>{
 const extra=extraFields({'Vehicle 1 VIN':vin,'Vehicle 2 VIN':second,'vehicles.0.vin':vin,'vehicles.1.vin':second,'vehicles.1.makeModel':'Ford Transit','vehicle-count':'2'});
 const lead=JSON.parse(JSON.stringify({extraFields:extra}));
 assert.deepEqual(leadVehicles(lead).map(v=>v.vin),[vin,second]);assert.equal(leadVehicles(lead)[1].makeModel,'Ford Transit');
});
test('legacy one-car leads still display',()=>{assert.equal(leadVehicles({vin,vehicle:'Honda Accord'})[0].vin,vin)});
test('last name and every selected VIN needed for quote readiness',()=>{
 const lead={id:1,name:'Ana Test',phone:'5551234567',product:'Commercial Auto',address:'1 Main St',state:'CA',zip:'91401',dateOfBirth:'1990-01-01',vin,extraFields:{'Vehicle 1 VIN':vin,'vehicle-count':'2'}};
 assert.equal(quoteReadiness(lead).ready,false);
 const complete={...lead,extraFields:{...lead.extraFields,'Vehicle 2 VIN':second}};
 assert.equal(quoteReadiness(complete).ready,true);assert.equal(quoteReadiness({...complete,name:'Ana'}).ready,false);
});
