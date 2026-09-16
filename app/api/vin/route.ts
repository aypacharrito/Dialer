import {getPacificaAccess} from "../../lib/clerk-access";
import {isClerkConfigured} from "../../lib/clerk-config";

export const runtime="nodejs";

type VpicResult=Record<string,string|null|undefined>;

function clean(value:unknown){return String(value??"").trim()}
function validVin(value:string){return /^[A-HJ-NPR-Z0-9]{17}$/.test(value)}

export async function POST(request:Request){
  const access=isClerkConfigured()?await getPacificaAccess():{allowed:process.env.NODE_ENV!=="production"};
  if(!access.allowed)return Response.json({error:"An active Pacifica subscription is required."},{status:403});

  let body:{vin?:unknown;modelYear?:unknown};
  try{body=await request.json() as {vin?:unknown;modelYear?:unknown};if(!body||typeof body!=="object"||Array.isArray(body))throw new Error()}catch{return Response.json({error:"Invalid request."},{status:400})}

  const vin=clean(body.vin).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!validVin(vin))return Response.json({error:"Enter a valid 17-character VIN. VINs do not use I, O, or Q."},{status:400});

  const year=clean(body.modelYear).replace(/\D/g,"").slice(0,4);
  const endpoint=new URL(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}`);
  endpoint.searchParams.set("format","json");
  if(year)endpoint.searchParams.set("modelyear",year);

  try{
    const response=await fetch(endpoint,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok)return Response.json({error:"NHTSA VIN service is temporarily unavailable."},{status:502});
    const payload=await response.json() as {Results?:VpicResult[]};
    const raw=payload.Results?.[0];
    if(!raw)return Response.json({error:"No VIN result was returned."},{status:404});

    const errorCode=clean(raw.ErrorCode),errorText=clean(raw.ErrorText);
    const make=clean(raw.Make),model=clean(raw.Model),modelYear=clean(raw.ModelYear);
    if(!make&&!model&&!modelYear)return Response.json({error:errorText||"This VIN could not be decoded.",errorCode},{status:422});

    const vehicle=[modelYear,make,model].filter(Boolean).join(" ");
    return Response.json({
      vin,vehicle,
      details:{
        modelYear,make,model,
        trim:clean(raw.Trim),
        bodyClass:clean(raw.BodyClass),
        vehicleType:clean(raw.VehicleType),
        driveType:clean(raw.DriveType),
        fuelType:clean(raw.FuelTypePrimary),
        engineCylinders:clean(raw.EngineCylinders),
        engineLiters:clean(raw.DisplacementL),
        transmission:clean(raw.TransmissionStyle),
        doors:clean(raw.Doors),
        manufacturer:clean(raw.Manufacturer),
        plantCountry:clean(raw.PlantCountry),
      },
      warning:errorCode&&errorCode!=="0"?errorText:"",
      source:"NHTSA vPIC"
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){
    const timeout=error instanceof Error&&error.name==="TimeoutError";
    return Response.json({error:timeout?"NHTSA VIN lookup timed out. Try again.":"VIN lookup failed. Try again."},{status:502});
  }
}
