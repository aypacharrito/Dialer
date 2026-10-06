export type FolderContact={id:string;name:string;phone:string;email:string;address:string;city:string;state:string;zip:string;product:string;sourceFile:string;sourcePage:string;review:string;approved:boolean};
const clean=(v:unknown,max=240)=>typeof v==='string'||typeof v==='number'?String(v).replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,max):'';
const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,'');
export function folderPhone(v:unknown){const value=clean(v),digits=value.replace(/\D/g,'');return /^1?\d{10}$/.test(digits)?'+1'+digits.slice(-10):/^\+\d{8,15}$/.test(value)?value:''}
export function folderEmail(v:unknown){const value=clean(v,180).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:''}
type IdentityContact={name?:string;phone?:string;email?:string;address?:string;zip?:string;city?:string;importedFields?:Record<string,string>};
export function folderIdentity(v:IdentityContact){
 const digits=String(v.phone||'').replace(/\D/g,''),phone=digits.length>=7?digits.slice(-10):'',email=folderEmail(v.email),name=key(v.name||'');
 const street=String(v.address||v.importedFields?.Address||v.importedFields?.Street||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\b(street|st)\b/g,'st').replace(/\b(avenue|ave)\b/g,'ave').replace(/\b(boulevard|blvd)\b/g,'blvd').replace(/\b(road|rd)\b/g,'rd').replace(/\b(drive|dr)\b/g,'dr').replace(/\b(lane|ln)\b/g,'ln');
 const address=key(street),area=key(v.zip||v.importedFields?.Zip||v.city||'');
 return [...(phone?['p:'+phone]:[]),...(email?['e:'+email]:[]),...(name&&address?['a:'+name+':'+address+':'+area]:[])];
}
const aliases:Record<string,string[]>={name:['name','fullname','contactname','namedinsured','insuredname','customername'],phone:['phone','phonenumber','mobile','mobilephone','cell','telephone'],email:['email','emailaddress'],address:['address','streetaddress','address1','mailingaddress'],city:['city'],state:['state','province'],zip:['zip','zipcode','postalcode'],product:['product','insurance','insurancetype','lineofbusiness']};
export function folderContact(record:Record<string,unknown>,sourceFile:string,sourcePage='',review=''):FolderContact|null{
 const fields=Object.fromEntries(Object.entries(record).map(([k,v])=>[key(k),v]));
 const find=(names:string[])=>clean(names.map(k=>fields[k]).find(v=>v!==undefined&&v!==''));const values=Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,find(v)]));
 values.name||=clean([find(['firstname','givenname']),find(['lastname','surname','familyname'])].filter(Boolean).join(' '),180);
 const phone=folderPhone(values.phone),email=folderEmail(values.email);
 if(!phone&&!email&&!(values.name&&values.address))return null;
 const issues=[review,!values.name?'Name missing':'',values.phone&&!phone?'Phone needs review':'',values.email&&!email?'Email needs review':''].filter(Boolean);
 return {id:crypto.randomUUID(),name:values.name,phone,email,address:values.address,city:values.city,state:values.state,zip:values.zip,product:values.product,sourceFile,sourcePage,review:issues.join(' · '),approved:false};
}
/** Labeled blocks only: never pair the first email on a page with an unrelated name. */
export function contactsFromText(text:string,file:string,page=''):FolderContact[]{
 const blocks=text.replace(/\r\n/g,'\n').split(/\n\s*\n/),result:FolderContact[]=[];
 for(const block of blocks){
  const record:Record<string,string>={};let conflict=false;
  for(const line of block.split('\n')){const match=line.match(/^\s*(full name|name|contact name|named insured|insured name|customer name|first name|last name|phone(?: number)?|mobile(?: phone)?|cell|telephone|email(?: address)?|(?:street |mailing )?address|city|state|zip(?: code)?|postal code|product|insurance type)\s*[:=]\s*(.+)$/i);if(match){const k=key(match[1]);if(record[k]&&record[k]!==match[2])conflict=true;record[k]=match[2]}}
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
export const folderCsvHeader=['Name','Phone','Email','Address','City','State','ZIP','Product','Source file','Page / row','Review'];
export function folderCsvCell(v:string){const safe=/^[\s\uFEFF]*[=+@-]/.test(v)||/^[\t\r\n]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"'}
export function folderCsvLine(row:FolderContact){return [row.name,row.phone,row.email,row.address,row.city,row.state,row.zip,row.product,row.sourceFile,row.sourcePage,row.review&&!row.approved?row.review:''].map(folderCsvCell).join(',')+'\r\n'}
