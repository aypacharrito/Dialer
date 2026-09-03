export type DocumentLeadField={label:string;value:string};

export type DocumentLeadExtraction={
  documentType:string;
  firstName:string;
  middleName:string;
  lastName:string;
  fullName:string;
  dateOfBirth:string;
  address:string;
  city:string;
  state:string;
  zip:string;
  licenseNumber:string;
  licenseState:string;
  licenseExpiration:string;
  policyNumber:string;
  carrier:string;
  policyEffectiveDate:string;
  policyExpirationDate:string;
  vin:string;
  vehicleYear:string;
  vehicleMake:string;
  vehicleModel:string;
  email:string;
  phone:string;
  product:string;
  otherFields:DocumentLeadField[];
};

const keys:[keyof Omit<DocumentLeadExtraction,"otherFields">,number][]=[
  ["documentType",80],["firstName",80],["middleName",80],["lastName",80],["fullName",180],
  ["dateOfBirth",30],["address",240],["city",100],["state",60],["zip",20],
  ["licenseNumber",80],["licenseState",60],["licenseExpiration",30],["policyNumber",100],
  ["carrier",160],["policyEffectiveDate",30],["policyExpirationDate",30],["vin",40],
  ["vehicleYear",10],["vehicleMake",80],["vehicleModel",100],["email",180],["phone",50],["product",100],
];

function text(value:unknown,max:number){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}

export function cleanDocumentLeadExtraction(value:unknown):DocumentLeadExtraction{
  const source=value&&typeof value==="object"?value as Record<string,unknown>:{};
  const result={} as Omit<DocumentLeadExtraction,"otherFields">;
  for(const [key,max] of keys)result[key]=text(source[key],max);
  const otherFields=Array.isArray(source.otherFields)?source.otherFields.slice(0,30).flatMap(raw=>{
    if(!raw||typeof raw!=="object")return [];
    const field=raw as Record<string,unknown>;const label=text(field.label,80);const value=text(field.value,300);
    return label&&value?[{label,value}]:[];
  }):[];
  return {...result,otherFields};
}

export function documentLeadName(extraction:DocumentLeadExtraction){
  return extraction.fullName||[extraction.firstName,extraction.middleName,extraction.lastName].filter(Boolean).join(" ");
}

export function documentLeadHasUsefulData(extraction:DocumentLeadExtraction){
  return Boolean(documentLeadName(extraction)||extraction.licenseNumber||extraction.policyNumber||extraction.vin||extraction.address||extraction.dateOfBirth||extraction.phone||extraction.email||extraction.otherFields.length);
}

export function documentLeadImportedFields(extraction:DocumentLeadExtraction){
  const pairs:Array<[string,string]>=[
    ["Document type",extraction.documentType],["Full name",documentLeadName(extraction)],["Phone",extraction.phone],["Email",extraction.email],
    ["Street address",extraction.address],["City",extraction.city],["State",extraction.state],["ZIP",extraction.zip],["Date of birth",extraction.dateOfBirth],
    ["Driver license number",extraction.licenseNumber],["Driver license state",extraction.licenseState],
    ["Driver license expiration",extraction.licenseExpiration],["Policy number",extraction.policyNumber],
    ["Insurance carrier",extraction.carrier],["Policy effective date",extraction.policyEffectiveDate],
    ["Policy expiration date",extraction.policyExpirationDate],["VIN",extraction.vin],
    ["Vehicle year",extraction.vehicleYear],["Vehicle make",extraction.vehicleMake],["Vehicle model",extraction.vehicleModel],
    ...extraction.otherFields.map(field=>[field.label,field.value] as [string,string]),
  ];
  return Object.fromEntries(pairs.filter(([,value])=>Boolean(value)));
}
