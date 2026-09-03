import OpenAI from "openai";
import {hasPacificaWorkspaceApiAccess} from "../../../lib/clerk-access";
import {cleanDocumentLeadExtraction} from "../../../lib/document-lead";

export const runtime="nodejs";
export const maxDuration=45;

const acceptedImage=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function modelCandidates(){return Array.from(new Set([process.env.OPENAI_VISION_MODEL?.trim(),process.env.OPENAI_MODEL?.trim(),"gpt-5-mini"].filter(Boolean) as string[]))}

export async function POST(request:Request){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try{
    const body=await request.json() as {image?:string;fileName?:string};
    const image=String(body.image||"");
    if(!acceptedImage.test(image))return Response.json({error:"Upload a JPEG, PNG, or WebP image."},{status:400});
    if(image.length>4_200_000)return Response.json({error:"That image is too large to scan. Retake it closer to the document."},{status:413});
    if(!process.env.OPENAI_API_KEY)return Response.json({error:"Document scanning needs OPENAI_API_KEY in the production environment."},{status:503});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});let result:unknown=null;let lastError="";
    for(const model of modelCandidates()){
      try{
        const response=await client.responses.create({
          model,store:false,
          input:[{role:"user",content:[
            {type:"input_text",text:`Read this ${String(body.fileName||"sales document").slice(0,120)} for a CRM lead. Extract only facts visibly printed in the image. Never infer, guess, complete, or correct missing facts. Keep dates as YYYY-MM-DD only when the full date is visible; otherwise preserve the visible value in otherFields. Treat identification and policy numbers as strings. Put useful visible fields that do not match the fixed schema in otherFields. Return empty strings for anything absent.`},
            {type:"input_image",image_url:image,detail:"high"},
          ]}],
          text:{format:{type:"json_schema",name:"pacifica_document_lead",strict:true,schema:{type:"object",additionalProperties:false,properties:{
            documentType:{type:"string"},firstName:{type:"string"},middleName:{type:"string"},lastName:{type:"string"},fullName:{type:"string"},dateOfBirth:{type:"string"},address:{type:"string"},city:{type:"string"},state:{type:"string"},zip:{type:"string"},licenseNumber:{type:"string"},licenseState:{type:"string"},licenseExpiration:{type:"string"},policyNumber:{type:"string"},carrier:{type:"string"},policyEffectiveDate:{type:"string"},policyExpirationDate:{type:"string"},vin:{type:"string"},vehicleYear:{type:"string"},vehicleMake:{type:"string"},vehicleModel:{type:"string"},email:{type:"string"},phone:{type:"string"},product:{type:"string"},otherFields:{type:"array",items:{type:"object",additionalProperties:false,properties:{label:{type:"string"},value:{type:"string"}},required:["label","value"]}},
          },required:["documentType","firstName","middleName","lastName","fullName","dateOfBirth","address","city","state","zip","licenseNumber","licenseState","licenseExpiration","policyNumber","carrier","policyEffectiveDate","policyExpirationDate","vin","vehicleYear","vehicleMake","vehicleModel","email","phone","product","otherFields"]}}},
          max_output_tokens:1800,
        });
        result=JSON.parse(response.output_text);break;
      }catch(error){lastError=error instanceof Error?error.message:"Document scan failed";console.error("[pacifica-ai/document-lead] model failed",{model,error:lastError})}
    }
    if(!result)return Response.json({error:"Pacifica could not read this image. Try a brighter, straight-on photo.",detail:lastError.slice(0,180)},{status:502});
    return Response.json({ok:true,extraction:cleanDocumentLeadExtraction(result)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("[pacifica-ai/document-lead] request failed",error instanceof Error?error.message:"Unknown error");return Response.json({error:"Pacifica could not process that photo."},{status:400})}
}
