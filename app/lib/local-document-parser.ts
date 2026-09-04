import {cleanDocumentLeadExtraction,documentLeadCompletenessScore,type DocumentLeadExtraction,type DocumentLeadField} from "./document-lead";

function title(value:string){return value.toLowerCase().replace(/(^|[\s'-])\p{L}/gu,letter=>letter.toUpperCase())}
function iso(value:string){const match=value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);return match?`${match[3]}-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`:""}
function valueAfter(text:string,code:string){const match=text.match(new RegExp(`(?:^|\\n)${code}([^\\n]*)`,"i"));return match?.[1]?.trim()||""}
function field(label:string,value:string):DocumentLeadField[]{return value?[{label,value}]:[]}

export function parseAamvaBarcode(raw:string):DocumentLeadExtraction{
  const text=raw.replace(/\r/g,"");
  const first=valueAfter(text,"DAC")||valueAfter(text,"DCT");
  const middle=valueAfter(text,"DAD");const last=valueAfter(text,"DCS");
  const address=valueAfter(text,"DAG");const city=valueAfter(text,"DAI");const state=valueAfter(text,"DAJ");const zip=valueAfter(text,"DAK").slice(0,5);
  const compactDate=(value:string)=>value.match(/^\d{8}$/)?`${value.slice(4)}-${value.slice(0,2)}-${value.slice(2,4)}`:iso(value);
  return cleanDocumentLeadExtraction({documentType:"Driver license",firstName:title(first),middleName:title(middle),lastName:title(last),fullName:title([first,middle,last].filter(Boolean).join(" ")),address:title(address),city:title(city),state:state.toUpperCase(),zip,licenseNumber:valueAfter(text,"DAQ"),licenseState:state.toUpperCase(),licenseExpiration:compactDate(valueAfter(text,"DBA")),dateOfBirth:compactDate(valueAfter(text,"DBB")),otherFields:[...field("Sex",valueAfter(text,"DBC")),...field("Eye color",valueAfter(text,"DAY")),...field("Height",valueAfter(text,"DAU"))]});
}

export function parseLicenseOcrText(raw:string):DocumentLeadExtraction{
  const text=raw.replace(/\r/g,"").replace(/[ \t]+/g," ");
  const last=text.match(/(?:^|\n)L[. ]?N\s+([^\n]+)/i)?.[1]?.replace(/\s+(?:FN|DOB|EXP).*$/i,"").trim()||"";
  const first=text.match(/(?:^|\n)F[. ]?N\s+([^\n]+)/i)?.[1]?.replace(/\s+(?:LN|DOB|EXP).*$/i,"").trim()||"";
  const fullName=[first,last].filter(Boolean).join(" ");
  const street=text.match(/(?:^|\n)(\d{1,6}\s+[A-Z0-9 .'-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|LANE|LN|CT|COURT)(?:\s+APT\s*\w+)?)/i)?.[1]||"";
  const locality=street?text.slice(text.indexOf(street)+street.length).match(/\s*\n?\s*([A-Z .'-]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i):null;
  const near=(label:string)=>text.match(new RegExp(`${label}[\\s\\S]{0,90}?(\\d{2}[\\/-]\\d{2}[\\/-]\\d{4}|\\d{8})`,"i"))?.[1]||"";
  const license=text.match(/(?:^|\n)DL\s*([A-Z]\d{7}|\d{7,10})\b/i)?.[1]||"";
  const extra=(label:string,pattern:RegExp)=>field(label,text.match(pattern)?.[1]?.trim()||"");
  const state=(locality?.[2]||(/California/i.test(text)?"CA":"")).toUpperCase();
  return cleanDocumentLeadExtraction({documentType:"Driver license",firstName:title(first),lastName:title(last),fullName:title(fullName),dateOfBirth:iso(near("DOB"))||(/^\d{8}$/.test(near("DOB"))?`${near("DOB").slice(4)}-${near("DOB").slice(0,2)}-${near("DOB").slice(2,4)}`:""),address:title(street),city:title(locality?.[1]?.trim()||""),state,zip:locality?.[3]||"",licenseNumber:license,licenseState:state,licenseExpiration:iso(near("EXP")),otherFields:[...extra("Sex",/\bSEX\s*[:8]?\s*([MF])\b/i),...extra("Hair",/\bHAIR\s+([A-Z]{3})\b/i),...extra("Eyes",/\bEYES\s+([A-Z]{3})\b/i),...extra("Height",/\bHGT\s+([^\n]+)/i),...extra("Weight",/\bWGT\s+([^\n]+)/i),...extra("Restrictions",/\bRSTR\s+([^\n]+)/i)]});
}

function monthsBetween(start:string,end:string){if(!start||!end)return "";const a=new Date(`${start}T00:00:00Z`);const b=new Date(`${end}T00:00:00Z`);return String(Math.max(1,Math.round((b.getTime()-a.getTime())/(30.4375*86_400_000))));}

export function parseInsuranceDeclarationText(raw:string):DocumentLeadExtraction{
  const text=raw.replace(/\r/g,"").replace(/[ \t]+/g," ");const flat=text.replace(/\s+/g," ");
  const policyNumber=flat.match(/Policy Number[\s\S]{0,180}?\b([A-Z]{2,}[A-Z0-9-]*\d[A-Z0-9-]*)\b/i)?.[1]||"";
  const period=flat.match(/From:\s*(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,80}?To:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const effective=iso(period?.[1]||"");const expiration=iso(period?.[2]||"");
  const insured=flat.match(/Named Insured\s+([A-Z][A-Z .'-]{2,}?)\s+(\d{1,6}\s+[A-Z0-9 .'-]+?)\s+([A-Z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s+(\(\d{3}\)\s*\d{3}-\d{4})\s+([\w.+-]+@[\w.-]+\.[A-Z]{2,})/i);
  const email=insured?.[7]||flat.match(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/i)?.[0]||"";const phone=insured?.[6]||flat.match(/\(\d{3}\)\s*\d{3}-\d{4}/)?.[0]||"";
  const company=flat.match(/\b([A-Z][A-Za-z& ]{2,60}(?:Insurance|Assurance|Indemnity) (?:Company|Group))\b/)?.[1]||"";
  const premium=flat.match(/Total\s+(?:(\d+)\s+Month\s+)?Policy Premium[^$]{0,80}\$\s*([\d,]+\.\d{2})/i);
  const billingFrequency=flat.match(/(?:Billing|Payment|Pay)\s+(?:Plan|Frequency|Mode)\s*:?\s*(Monthly|Quarterly|Semi[- ]?Annual|Annual|Paid in Full|Full Pay)/i)?.[1]||"";
  const installment=flat.match(/(?:Monthly|Installment)\s+(?:Premium|Payment|Amount)\s*:?[^$\d]{0,30}\$\s*([\d,]+\.\d{2})/i)?.[1]?.replace(/,/g,"")||"";
  const vehicles=[...flat.matchAll(/((?:19|20)\d{2})\s+([A-Z0-9][A-Z0-9 ]{2,55}?),\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi)];
  const otherFields:DocumentLeadField[]=[];
  vehicles.forEach((match,index)=>{otherFields.push({label:`Vehicle ${index+1}`,value:`${match[1]} ${title(match[2].trim())}`},{label:`Vehicle ${index+1} VIN`,value:match[3]})});
  const drivers=flat.match(/Listed Drivers\s+([\s\S]*?)\s+Excluded Drivers/i)?.[1]?.replace(/\s+-\s+\d+\s+Years License Experience/g,"; ").trim().replace(/;+$/,"")||"";
  if(drivers)otherFields.push({label:"Listed drivers",value:title(drivers)});
  const firstVehicle=vehicles[0];const vehicleWords=firstVehicle?.[2]?.trim().split(/\s+/)||[];
  return cleanDocumentLeadExtraction({documentType:"Insurance declarations",fullName:title(insured?.[1]||""),address:title(insured?.[2]||""),city:title(insured?.[3]?.trim()||""),state:insured?.[4]||"",zip:insured?.[5]||"",phone,email,policyNumber,carrier:company,policyEffectiveDate:effective,policyExpirationDate:expiration,policyPremium:premium?.[2]?.replace(/,/g,"")||"",policyTermMonths:premium?.[1]||monthsBetween(effective,expiration),billingFrequency,installmentAmount:installment,vin:firstVehicle?.[3]||"",vehicleYear:firstVehicle?.[1]||"",vehicleMake:title(vehicleWords.shift()||""),vehicleModel:title(vehicleWords.join(" ")),product:"Auto insurance",otherFields});
}

export function bestDocumentExtraction(raw:string){
  const candidates=[parseInsuranceDeclarationText(raw),parseLicenseOcrText(raw),parseAamvaBarcode(raw)];
  return candidates.sort((a,b)=>documentLeadCompletenessScore(b)-documentLeadCompletenessScore(a))[0];
}
