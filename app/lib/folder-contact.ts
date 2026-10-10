export type FolderContact={conflicts?:Array<{field:string;value:string;file:string;page:string}>;sources?:Array<{file:string;page:string}>;importedFields?:Record<string,string>;id:string;name:string;phone:string;email:string;address:string;city:string;state:string;zip:string;product:string;sourceFile:string;sourcePage:string;review:string;approved:boolean};
const clean=(v:unknown,max=240)=>typeof v==='string'||typeof v==='number'?String(v).replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,max):'';
const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,'');
const businessWords=/\b(?:llc|inc|incorporated|corp|corporation|company|co|agency|insurance|associates|association|services|solutions|group|holdings|partners|enterprises|motors|automotive|auto|bank|credit union|school|university|department|restaurant|clinic|hospital|church|foundation|trust|properties|realty|real estate)\b/i;
const sensitiveLabel=/\b(?:ssn|social security|tax id|ein|password|passcode|pin|routing|bank account|account number|card number|credit card|cvv|medical|diagnosis|health condition)\b/i;
const coreKeys=new Set(['name','fullname','contactname','namedinsured','insuredname','customername','firstname','givenname','lastname','surname','familyname','phone','phonenumber','mobile','mobilephone','cell','telephone','email','emailaddress','address','streetaddress','address1','mailingaddress','city','state','province','zip','zipcode','postalcode','product','insurance','insurancetype','lineofbusiness']);
export function folderPhone(v:unknown){const value=clean(v),digits=value.replace(/\D/g,'');return /^1?\d{10}$/.test(digits)?'+1'+digits.slice(-10):/^\+\d{8,15}$/.test(value)?value:''}
export function folderEmail(v:unknown){const value=clean(v,180).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:''}
export function folderHumanName(v:unknown){
 const value=clean(v,180).replace(/\s+/g,' '),parts=value.split(' ').filter(Boolean);
 if(parts.length<2||parts.length>6||businessWords.test(value))return '';
 return parts.every(part=>/^[\p{L}][\p{L}'’.\-]{0,39}$/u.test(part))?value:'';
}
type IdentityContact={name?:string;phone?:string;email?:string;address?:string;zip?:string;city?:string;importedFields?:Record<string,string>};
export function folderIdentity(v:IdentityContact){
 const digits=String(v.phone||'').replace(/\D/g,''),phone=digits.length>=7?digits.slice(-10):'',email=folderEmail(v.email),name=key(v.name||'');
 const street=String(v.address||v.importedFields?.Address||v.importedFields?.Street||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\b(street|st)\b/g,'st').replace(/\b(avenue|ave)\b/g,'ave').replace(/\b(boulevard|blvd)\b/g,'blvd').replace(/\b(road|rd)\b/g,'rd').replace(/\b(drive|dr)\b/g,'dr').replace(/\b(lane|ln)\b/g,'ln');
 const address=key(street),area=key(v.zip||v.importedFields?.Zip||v.city||'');
 return [...(phone?['p:'+phone]:[]),...(email?['e:'+email]:[]),...(name&&address?['a:'+name+':'+address+':'+area]:[])];
}
const aliases:Record<string,string[]>={name:['name','fullname','contactname','namedinsured','insuredname','customername'],phone:['phone','phonenumber','mobile','mobilephone','cell','telephone'],email:['email','emailaddress'],address:['address','streetaddress','address1','mailingaddress'],city:['city'],state:['state','province'],zip:['zip','zipcode','postalcode'],product:['product','insurance','insurancetype','lineofbusiness']};
export function folderContact(record:Record<string,unknown>,sourceFile:string,sourcePage='',review=''):FolderContact|null{
 const normalized=Object.entries(record).map(([label,value])=>({label:clean(label,80),key:key(label),value:clean(value,500)}));
 const fields=Object.fromEntries(normalized.map(item=>[item.key,item.value]));
 const find=(names:string[])=>clean(names.map(k=>fields[k]).find(v=>v!==undefined&&v!==''));const values=Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,find(v)]));
 values.name||=clean([find(['firstname','givenname']),find(['lastname','surname','familyname'])].filter(Boolean).join(' '),180);
 const name=folderHumanName(values.name),phone=folderPhone(values.phone),email=folderEmail(values.email);
 if(!name||!phone)return null;
 const importedFields=Object.fromEntries(normalized.filter(item=>item.label&&item.value&&!coreKeys.has(item.key)&&!sensitiveLabel.test(item.label)).slice(0,60).map(item=>[item.label,item.value]));
 const issues=[review,values.name&&!name?'Human name needs review':'',values.phone&&!phone?'Phone needs review':'',values.email&&!email?'Email needs review':''].filter(Boolean);
 return {id:crypto.randomUUID(),name,phone,email,address:values.address,city:values.city,state:values.state,zip:values.zip,product:values.product,importedFields,sourceFile,sourcePage,review:issues.join(' · '),approved:false};
}
/** Labeled blocks only: never pair the first phone on a page with an unrelated name. */
export function contactsFromText(text:string,file:string,page=''):FolderContact[]{
 const blocks=text.replace(/\r\n/g,'\n').split(/\n\s*\n/),result:FolderContact[]=[];
 for(const block of blocks){
  const record:Record<string,string>={};let conflict=false;
  for(const line of block.split('\n')){const match=line.match(/^\s*([^:=]{1,80})\s*[:=]\s*(.+)$/);if(match&&!sensitiveLabel.test(match[1])){const k=match[1].trim();if(record[k]&&record[k]!==match[2])conflict=true;record[k]=match[2]}}
  const contact=folderContact(record,file,page,conflict?'Multiple people or values; check source':'Check extracted text against source');
  if(contact)result.push(contact);
 }
 return result;
}
/** RFC 4180-style streaming parser: carries quoted fields across chunks. */
export async function* folderCsvRows(chunks:AsyncIterable<string>,delimiter=','):AsyncGenerator<string[]>{
 let row:string[]=[],field='',quoted=false,afterQuote=false,skipLF=false,recordSize=0;
 for await(const chunk of chunks)for(const char of chunk){
  if(skipLF){skipLF=false;if(char==='\n')continue}
  if(++recordSize>1024*1024)throw Error('A CSV record exceeds 1 MB.');
  if(quoted){
   if(afterQuote){if(char==='"'){field+='"';afterQuote=false;continue}quoted=false;afterQuote=false;if(char!==delimiter&&char!=='\r'&&char!=='\n'&&!/\s/.test(char))throw Error('Invalid text after a quoted CSV field.');if(char!==delimiter&&char!=='\r'&&char!=='\n')continue}
   else{if(char==='"')afterQuote=true;else field+=char;continue}
  }
  if(char==='"'&&!field){quoted=true;continue}
  if(char===delimiter){row.push(field);field='';continue}
  if(char==='\n'||char==='\r'){row.push(field);if(row.some(v=>v.trim()))yield row;row=[];field='';recordSize=0;skipLF=char==='\r';continue}
  field+=char;
 }
 if(quoted&&!afterQuote)throw Error('Unterminated quoted CSV field.');
 if(field||row.length){row.push(field);if(row.some(v=>v.trim()))yield row}
}
export function contactsFromVcard(text:string,file:string){
 return text.replace(/\r?\n[ \t]/g,'').split(/BEGIN:VCARD/i).slice(1).flatMap((block,index)=>{
  const record:Record<string,string>={};
  for(const line of block.split(/\r?\n/)){const colon=line.indexOf(':');if(colon<0)continue;const field=line.slice(0,colon).split(';')[0].toUpperCase(),value=line.slice(colon+1).replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1');
   if(field==='FN')record.name=value;if(field==='N'&&!record.name){const parts=value.split(';');record.name=[parts[1],parts[2],parts[0]].filter(Boolean).join(' ')}
   if(field==='TEL'&&!record.phone)record.phone=value.replace(/^tel:/i,'');if(field==='EMAIL'&&!record.email)record.email=value;
   if(field==='ADR'){const p=value.split(';');Object.assign(record,{address:p[2],city:p[3],state:p[4],zip:p[5]})}
  }const contact=folderContact(record,file,'Card '+(index+1));return contact?[contact]:[];
 });
}
export function newFolderContacts<T extends IdentityContact>(existing:T[],candidates:FolderContact[]){
 const seen=new Set(existing.flatMap(folderIdentity)),added:FolderContact[]=[];
 for(const item of candidates){if(item.review&&!item.approved)continue;const keys=folderIdentity(item);if(!keys.length||keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));added.push(item)}
 return added;
}
export const folderCsvHeader=['Name','Phone','Email','Address','City','State','ZIP','Product','Additional fields','Source file','Page / row','Review','All sources','Conflicting values'];
export function folderCsvCell(v:string){const safe=/^[\s\uFEFF]*[=+@-]/.test(v)||/^[\t\r\n]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"'}
export function folderCsvLine(row:FolderContact){return [row.name,row.phone,row.email,row.address,row.city,row.state,row.zip,row.product,Object.entries(row.importedFields||{}).map(([label,value])=>label+': '+value).join('; '),row.sourceFile,row.sourcePage,row.review&&!row.approved?row.review:'',(row.sources||[{file:row.sourceFile,page:row.sourcePage}]).map(source=>source.file+' · '+source.page).join('; '),(row.conflicts||[]).map(item=>item.field+': '+item.value+' ('+item.file+' · '+item.page+')').join('; ')].map(folderCsvCell).join(',')+'\r\n'}
