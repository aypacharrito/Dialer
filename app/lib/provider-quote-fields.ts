export function extraFields(record:Record<string,unknown>){
  const known=new Set(["id","leadid","deliveryid","firstname","lastname","name","fullname","prospect","customername","phone","phonenumber","primaryphone","telephone","mobile","email","emailaddress","city","location","type","product","leadtype","vertical","insurancetype","disposition","status","leadstatus","notes","note","comments","cost","leadcost","price","source","provider","vendor","leadsource","publisher","createdat","timestamp","received","address","streetaddress","address1","street","state","province","zip","zipcode","postalcode","territory","market","brand","agency","company","profilename","profile","campaign","return","returnstatus","numberofemployees","employees","employeecount","searchpro"]);
  const blocked=/secret|token|password|authorization|socialsecurity|ssn/i;
  const output:Record<string,string>={};
  const used=new Set<string>();
  for(const [rawKey,rawValue] of Object.entries(record)){
    // Keep indexed vehicle and driver fields; leaf aliases only retain the first value.
    // Check the full path so sensitive nested fields remain excluded.
    const key=rawKey.toLowerCase().replace(/[^a-z0-9]/g,"");
    if(!key||known.has(key)||blocked.test(key)||used.has(key))continue;
    if(!["string","number","boolean"].includes(typeof rawValue))continue;
    const value=String(rawValue).trim();if(!value||value.length>500)continue;
    output[rawKey]=value;used.add(key);
    if(Object.keys(output).length>=200)break;
  }
  return output;
}
