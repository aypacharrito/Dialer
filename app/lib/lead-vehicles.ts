export type LeadVehicle={number:number;vin:string;year:string;makeModel:string;use:string;annualMiles:string};
type VehicleLead={vin?:string;vehicle?:string;extraFields?:Record<string,string>;importedFields?:Record<string,string>};
export function leadVehicles(lead:VehicleLead):LeadVehicle[]{
  const fields={...lead.extraFields,...lead.importedFields};
  const grouped=new Map<number,LeadVehicle>();
  const ensure=(number:number)=>{
    if(!grouped.has(number))grouped.set(number,{number,vin:'',year:'',makeModel:'',use:'',annualMiles:''});
    return grouped.get(number)!;
  };
  for(const [key,value] of Object.entries(fields)){
    const match=key.match(/(?:^|[.])vehicles?\s*[.\[_ -]?(\d+)[\] ._-]+(.+)$/i);
    if(!match)continue;
    const zeroBased=/vehicles[.\[]/i.test(key);
    const number=Number(match[1])+(zeroBased?1:0);
    if(number<1||number>100)continue;
    const field=match[2].toLowerCase().replace(/[^a-z]/g,'');
    const v=ensure(number);
    if(field==='vin'||field==='vehicleidentificationnumber')v.vin=String(value).trim().toUpperCase();
    else if(field==='year')v.year=String(value).trim();
    else if(['makemodel','makeandmodel','vehicle'].includes(field))v.makeModel=String(value).trim();
    else if(field==='make'||field==='model')v.makeModel=[v.makeModel,String(value).trim()].filter(Boolean).join(' ');
    else if(field==='use'||field==='primaryuse')v.use=String(value).trim();
    else if(field==='annualmiles'||field==='annualmileage')v.annualMiles=String(value).trim();
  }
  const count=Number(Object.entries(fields).find(([key])=>key.toLowerCase().replace(/[^a-z]/g,'')==='vehiclecount')?.[1]||0);
  for(let n=1;n<=Math.min(100,count);n++)ensure(n);
  if(!grouped.size&&(lead.vin||lead.vehicle))Object.assign(ensure(1),{vin:lead.vin||'',makeModel:lead.vehicle||''});
  return [...grouped.values()].filter(v=>!count||v.number<=count).sort((a,b)=>a.number-b.number);
}
