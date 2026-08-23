export const runtime = "edge";

export async function GET(){
  return Response.json({
    life:Boolean(process.env.INSURANCE_TOOLKITS_API_KEY && process.env.INSURANCE_TOOLKITS_API_URL),
    propertyCasualty:Boolean(process.env.PERSONAL_LINES_RATER_API_KEY && process.env.PERSONAL_LINES_RATER_API_URL)
  },{headers:{"Cache-Control":"no-store"}});
}
