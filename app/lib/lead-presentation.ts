/** Presentation-only filtering; the original imported record remains intact. */
export function hasLeadDetail(value:unknown):boolean {
  if(value===null||value===undefined)return false;
  const text=String(value).trim();
  return Boolean(text)&&!/^(?:[-–—]+|n\/?a|not available|null|undefined)$/i.test(text);
}

const displayedLeadFieldKeys=new Set([
  "id","leadid","vendorid","firstname","lastname","fullname","name","contactname",
  "phone","phonenumber","cell","cellphone","mobile","mobilephone",
  "email","emailaddress","address","street","streetaddress","address1","address2","city","state","province","zip","zipcode","postalcode",
  "source","leadsource","provider","product","producttype","leadcost","received","receivedat","created","createdat","datecreated",
  "status","originalstatus","disposition","sourcedisposition","lastcontact","brand","agency","brandagency","leadprofile","profilename","territory","returnstatus","employees","employeecount","searchpro",
  "csvfilename","csvsourcefile","importedat","csvupdatedat"
]);

function normalizedLeadFieldKey(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"")}
function leadFieldLabel(value:string){return value.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,letter=>letter.toUpperCase())}
export function supplementalLeadDetails(lead:{importedFields?:Record<string,unknown>;extraFields?:Record<string,unknown>}){
  const details=new Map<string,{label:string;value:string}>();
  for(const [field,raw] of [...Object.entries(lead.importedFields||{}),...Object.entries(lead.extraFields||{})]){
    const value=String(raw??"").trim();const key=normalizedLeadFieldKey(field);if(!hasLeadDetail(value)||!key||displayedLeadFieldKeys.has(key)||details.has(key))continue;
    details.set(key,{label:leadFieldLabel(field),value});
  }
  return Array.from(details.values());
}

