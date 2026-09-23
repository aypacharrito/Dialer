import {displayBirthDate} from './lead-presentation';
import {clientDates} from './client-portfolio';
type ExportContact={id:number;name:string;deletedAt?:string;importedFields?:Record<string,string>;extraFields?:Record<string,string>;[key:string]:unknown};
const fields=[['id','CRM ID'],['name','Full name'],['phone','Phone'],['email','Email'],['product','Product'],['source','Source'],['address','Address'],['city','City'],['state','State'],['zip','ZIP'],['dateOfBirth','Date of birth'],['renewalDate','Renewal date'],['policyNumber','Policy number'],['policyEffectiveDate','Policy effective date'],['policyExpirationDate','Policy expiration date'],['vin','VIN'],['vehicle','Vehicle'],['stage','Stage'],['outcome','Outcome'],['sourceDisposition','Source disposition'],['assignedTo','Assigned owner'],['followUp','Follow-up'],['received','Received'],['leadCost','Lead cost'],['policyPremium','Policy premium'],['policyTermMonths','Policy term months'],['closedRevenue','Closed revenue'],['doNotCall','Do not call'],['smsOptOut','SMS opt-out'],['emailOptOut','Email opt-out'],['notes','Notes']] as const;
function cell(raw:unknown){let value=raw===null||raw===undefined?'':String(raw);if(/^[\s\uFEFF]*[=+@-]/.test(value)||/^[\t\r\n]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"'}
/** Exports only supplied contacts; preserves restrictions and protects spreadsheet formulas. */
export function contactsCsv(input:ExportContact[]){
 const leads=input.filter(l=>!l.deletedAt);
 const extra=[...new Set(leads.flatMap(l=>[...Object.keys(l.importedFields||{}),...Object.keys(l.extraFields||{})]))].sort();
 const rows:unknown[][]=[[...fields.map(([,label])=>label),...extra.map(key=>`Source: ${key}`)]];
 for(const lead of leads){const dates=clientDates(lead as Parameters<typeof clientDates>[0]);rows.push([...fields.map(([key])=>key==='dateOfBirth'?displayBirthDate(dates.dateOfBirth):key==='renewalDate'?dates.renewalDate:lead[key]??''),...extra.map(key=>lead.importedFields?.[key]??lead.extraFields?.[key]??'')])}
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function downloadContactsCsv(csv:string,name:string){const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
