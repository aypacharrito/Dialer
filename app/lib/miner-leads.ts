export const leadKinds=['home','auto','commercial','real-estate'] as const;
export type LeadKind=typeof leadKinds[number];
export const kindLabel:Record<LeadKind,string>={home:'Home',auto:'Auto',commercial:'Commercial','real-estate':'Real estate'};
export type MinerCampaign={id:string;name:string;kind:LeadKind;createdAt:string;expiresAt:string;revoked:boolean;autoImport?:boolean};
export type MinerInquiry={id:string;campaignId:string;kind:LeadKind;name:string;phone:string;email:string;zip:string;details:string;permission:boolean;submittedAt:string;status:'pending'|'imported'|'dismissed';consentText:string};
export type MinerSource='city'|'parcels'|'licensees'|'businesses';
export type MinerSearch={id:string;source:MinerSource;kind:LeadKind;zip:string;enabled:boolean;cursor:number;lastRunAt:string;lastStatus:string;lastAdded:number};
export type MinerState={campaigns:MinerCampaign[];inquiries:MinerInquiry[];searches:MinerSearch[]};
export type SourceProspect={key:string;name:string;phone:string;email:string;address:string;city:string;zip:string;kind:LeadKind;source:string;url:string;fields:Record<string,string>};
export function isLeadKind(value:unknown):value is LeadKind{return leadKinds.includes(value as LeadKind)}
export function cleanMinerState(value:unknown):MinerState{
 const v=value&&typeof value==='object'?value as Partial<MinerState>:{};
 return {campaigns:Array.isArray(v.campaigns)?v.campaigns.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&typeof x.name==='string').slice(-100):[],inquiries:Array.isArray(v.inquiries)?v.inquiries.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&typeof x.name==='string').slice(-1000):[],searches:Array.isArray(v.searches)?v.searches.filter(x=>x&&typeof x.id==='string'&&isLeadKind(x.kind)&&['city','parcels','licensees','businesses'].includes(x.source)&&/^\d{5}$/.test(x.zip)).slice(0,12):[]};
}
export const minerSources:{id:MinerSource;name:string;kinds:LeadKind[];detail:string}[]=[
 {id:'city',name:'LA City business registrations',kinds:['commercial'],detail:'Active registered businesses. Phone and buying interest are not supplied.'},
 {id:'parcels',name:'LA County property records',kinds:['home','real-estate'],detail:'Residential parcels and building details. These records do not identify owners or provide contact details.'},
 {id:'businesses',name:'OpenStreetMap businesses',kinds:['commercial','auto','real-estate'],detail:'Published business listings and contact details. Auto and real-estate results are potential referral partners.'},
 {id:'licensees',name:'California real-estate licensees',kinds:['real-estate','commercial'],detail:'Licensed professionals for referral research. This is not a list of buyers or sellers. The directory download may take a moment.'},
];
export function validSearch(source:unknown,kind:unknown,zip:unknown,page:unknown){return isLeadKind(kind)&&minerSources.some(s=>s.id===source&&s.kinds.includes(kind))&&typeof zip==='string'&&/^\d{5}$/.test(zip)&&Number.isInteger(page)&&Number(page)>=0&&Number(page)<=1000;}
export function captureConsent(business:string){return `I ask ${business} to contact me by phone or email about this request. This is not consent to automated marketing texts.`}
export function cleanInquiry(raw:Record<string,unknown>,kind:LeadKind){
 const name=String(raw.name||'').trim().slice(0,140),phone=String(raw.phone||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,''),email=String(raw.email||'').trim().toLowerCase().slice(0,180),zip=String(raw.zip||'').trim();
 if(name.length<2)throw Error('Enter your name.');
 if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone)&&!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter a valid phone number or email.');
 if(phone&&!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone))throw Error('Enter a valid US phone number.');
 if(email&&!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter a valid email.');
 if(!/^\d{5}$/.test(zip))throw Error('Enter a five-digit ZIP code.');
 if(raw.permission!==true)throw Error('Confirm that you want a response to this request.');
 return {name,phone,email,zip,kind,details:String(raw.details||'').trim().slice(0,2000),permission:true};
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
