export const leadKinds=['home','auto','commercial','real-estate'] as const;
export type LeadKind=typeof leadKinds[number];
export const kindLabel:Record<LeadKind,string>={home:'Home',auto:'Auto',commercial:'Commercial','real-estate':'Real estate'};
export type MinerCampaign={id:string;name:string;kind:LeadKind;createdAt:string;expiresAt:string;revoked:boolean;autoImport?:boolean};
export type MinerInquiry={id:string;campaignId:string;kind:LeadKind;name:string;phone:string;email:string;zip:string;details:string;permission:boolean;submittedAt:string;status:'pending'|'imported'|'dismissed';consentText:string};
export type MinerSource='all'|'city'|'parcels'|'licensees'|'businesses'|'permits'|'occupancy'|'roof-solar'|'auto-dealers'|'auto-service'|'driving-schools'|'home-trades'|'home-finance';
export type MinerSearch={id:string;source:MinerSource;kind:LeadKind;zip:string;enabled:boolean;cursor:number;lastRunAt:string;lastStatus:string;lastAdded:number};
export type MinerState={campaigns:MinerCampaign[];inquiries:MinerInquiry[];searches:MinerSearch[]};
export type SourceProspect={key:string;name:string;phone:string;email:string;address:string;city:string;zip:string;kind:LeadKind;source:string;url:string;fields:Record<string,string>};
export function isLeadKind(value:unknown):value is LeadKind{return leadKinds.includes(value as LeadKind)}
export function cleanMinerState(value:unknown):MinerState{
 const v=value&&typeof value==='object'?value as Partial<MinerState>:{};
 return {campaigns:Array.isArray(v.campaigns)?v.campaigns.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&typeof x.name==='string').slice(-100):[],inquiries:Array.isArray(v.inquiries)?v.inquiries.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&typeof x.name==='string').slice(-1000):[],searches:Array.isArray(v.searches)?v.searches.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&minerSources.some(s=>s.id===x.source&&s.kinds.includes(x.kind))&&/^\d{5}$/.test(x.zip)).slice(0,12):[]};
}
export const minerSources:{id:MinerSource;name:string;kinds:LeadKind[];detail:string}[]=[
 {id:'all',name:'All available sources',kinds:['auto','home','commercial','real-estate'],detail:'Searches this category’s sources together. Each result keeps its origin; unavailable sources are reported separately.'},
 {id:'permits',name:'LA residential building permits',kinds:['home','real-estate'],detail:'Issued permits from 2020 onward: renovations, additions and construction. A permit is a property signal, not an insurance request.'},
 {id:'occupancy',name:'LA certificates of occupancy',kinds:['home','real-estate'],detail:'Residential completion records. Occupancy dates do not establish ownership, contact permission or policy renewal dates.'},
 {id:'roof-solar',name:'LA roof, solar and ADU projects',kinds:['home','real-estate'],detail:'Home improvements that may warrant a coverage review. Verify project completion and underwriting details with the customer.'},
 {id:'auto-dealers',name:'Vehicle dealers · OpenStreetMap',kinds:['auto','commercial'],detail:'Published car and motorcycle dealers near your ZIP for referral partnerships. These are businesses, not drivers requesting quotes.'},
 {id:'auto-service',name:'Auto repair, tires and inspection · OpenStreetMap',kinds:['auto','commercial'],detail:'Repair and inspection businesses near your ZIP. Build referral relationships using your Auto request form.'},
 {id:'driving-schools',name:'Driving schools · OpenStreetMap',kinds:['auto','commercial'],detail:'Potential new-driver referral partners. Student names or private driver records are not supplied.'},
 {id:'home-trades',name:'Roofers, builders and trades · OpenStreetMap',kinds:['home','commercial'],detail:'Public businesses near your ZIP for homeowner referrals; trade listings do not identify their customers.'},
 {id:'home-finance',name:'Property and mortgage partners · OpenStreetMap',kinds:['home','real-estate','commercial'],detail:'Real-estate offices and mortgage brokers near your ZIP for introductions and purchase-related referrals.'},
 {id:'city',name:'LA City business registrations',kinds:['commercial'],detail:'Active registered businesses. Phone and buying interest are not supplied.'},
 {id:'parcels',name:'LA County property records',kinds:['home','real-estate'],detail:'Residential parcels and building details. These records do not identify owners or provide contact details.'},
 {id:'businesses',name:'OpenStreetMap businesses',kinds:['commercial','auto','home','real-estate'],detail:'Published business listings and contact details. Auto and real-estate results are potential referral partners.'},
 {id:'licensees',name:'California real-estate licensees',kinds:['home','real-estate','commercial'],detail:'Licensed professionals for referral research. This is not a list of buyers or sellers. The directory download may take a moment.'},
];
export function validSearch(source:unknown,kind:unknown,zip:unknown,page:unknown){return isLeadKind(kind)&&minerSources.some(s=>s.id===source&&s.kinds.includes(kind))&&typeof zip==='string'&&/^\d{5}$/.test(zip)&&Number.isInteger(page)&&Number(page)>=0&&Number(page)<=1000;}
export function captureConsent(business:string){return `I ask ${business} to contact me by phone or email about this request. This is not consent to automated marketing texts.`}
export type CaptureQuestion={name:string;label:string;type:'text'|'date'|'select'|'number';options?:string[]};
export function captureQuestions(kind:LeadKind):CaptureQuestion[]{
 if(kind!=='home'&&kind!=='auto')return [];
 return [
  {name:'reason',label:'What brings you here?',type:'select',options:kind==='auto'?['Compare my renewal','Buying a vehicle','Adding a driver','Need coverage now','Other']:['Compare my renewal','Buying a home','Property improvements','Need coverage now','Other']},
  {name:'carrier',label:'Current carrier',type:'text'},
  {name:'premium',label:'Current premium amount',type:'number'},
  {name:'premiumPeriod',label:'Premium period',type:'select',options:['Monthly','Six months','Annual','Not sure']},
  {name:'renewalDate',label:'Renewal or needed start date',type:'date'},
  ...(kind==='auto'?[{name:'vehicles',label:'Number of vehicles',type:'number' as const},{name:'coverage',label:'Current coverage',type:'select' as const,options:['Liability only','Liability + collision/comprehensive','Not currently insured','Not sure']}]:[{name:'propertyAddress',label:'Property address',type:'text' as const},{name:'occupancy',label:'Property use',type:'select' as const,options:['My residence','Rental property','New purchase','Other']}]),
 ];
}
export function cleanInquiry(raw:Record<string,unknown>,kind:LeadKind){
 const name=String(raw.name||'').trim().slice(0,140),phone=String(raw.phone||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,''),email=String(raw.email||'').trim().toLowerCase().slice(0,180),zip=String(raw.zip||'').trim();
 if(name.length<2)throw Error('Enter your name.');
 if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone)&&!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter a valid phone number or email.');
 if(phone&&!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone))throw Error('Enter a valid US phone number.');
 if(email&&!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter a valid email.');
 if(!/^\d{5}$/.test(zip))throw Error('Enter a five-digit ZIP code.');
 if(raw.permission!==true)throw Error('Confirm that you want a response to this request.');
 const answers=captureQuestions(kind).flatMap(q=>{const value=String(raw[q.name]||'').trim().slice(0,160);if(!value)return [];if(q.options&&!q.options.includes(value))throw Error('Enter a listed '+q.label.toLowerCase()+'.');if(q.type==='number'&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1000000))throw Error('Enter a valid '+q.label.toLowerCase()+'.');if(q.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Enter a valid date.');return [`${q.label}: ${value}`]});
 return {name,phone,email,zip,kind,details:[...answers,String(raw.details||'').trim().slice(0,2000)].filter(Boolean).join('\n').slice(0,3200),permission:true};
}
/** Quoted commas, escaped quotes and embedded newlines are preserved. */
export function* csvRows(text:string):Generator<string[]>{
 let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))yield row;row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('CSV contains an unclosed quoted field.');row.push(cell);if(row.some(Boolean))yield row;
}
export function parseCsv(text:string){return Array.from(csvRows(text));}
export function csvRecords(text:string){const [head,...rows]=parseCsv(text.replace(/^\uFEFF/,''));if(!head)return [];return rows.map(row=>Object.fromEntries(head.map((h,i)=>[h.toLowerCase().replace(/[^a-z0-9]/g,''),row[i]?.trim()||''])));}
export function sourceRecord(row:Record<string,string>,source:string,kind:LeadKind,url:string):SourceProspect|null{
 const get=(...keys:string[])=>keys.map(k=>row[k]).find(Boolean)||'';
 const name=get('businessname','licensename','name','fullname','dba','ownername');
 const key=get('licensenumber','license','licenseno','id','ain','apn')||[name,get('address','address1','streetaddress'),get('zip','zipcode','zip5')].join('|');
 if(!name)return null;
 return {key:`${source}:${key}`,name,phone:get('businessphone','phone','phonenumber','telephone'),email:get('email','emailaddress'),address:get('address','address1','streetaddress','mailingaddress'),city:get('city','mailingcity'),zip:get('zip','zipcode','zip5','mailingzip').slice(0,5),kind,source,url,fields:Object.fromEntries(Object.entries(row).filter(([,v])=>v).slice(0,35))};
}
