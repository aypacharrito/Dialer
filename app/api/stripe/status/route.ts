import { getStripe, getStripeConfigurationStatus, stripePlanPrices } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const status=getStripeConfigurationStatus();
  const plans:Record<string,unknown>={...status.plans};
  if(status.keyConfigured){
    try{
      const stripe=getStripe();
      for(const [name,priceId] of Object.entries(stripePlanPrices)){
        const base=status.plans[name as keyof typeof status.plans];
        if(!priceId.startsWith("price_")){plans[name]={...base,verified:false,errorCode:"invalid_price_format"};continue}
        try{
          const price=await stripe.prices.retrieve(priceId);
          plans[name]={...base,verified:true,active:price.active,livemode:price.livemode,recurring:price.type==="recurring",modeMatches:price.livemode===(status.mode==="live")};
        }catch(error){const stripeError=error as {code?:string;type?:string};plans[name]={...base,verified:false,errorCode:stripeError.code||stripeError.type||"price_lookup_failed"}}
      }
    }catch(error){return Response.json({...status,configured:false,checkoutReady:false,keyError:error instanceof Error?error.message:"stripe_key_error",plans},{headers:{"Cache-Control":"no-store"}})}
  }
  const checkoutReady=status.keyConfigured&&Object.values(plans).every(value=>{const plan=value as {configured?:boolean;validFormat?:boolean;verified?:boolean;active?:boolean;recurring?:boolean;modeMatches?:boolean};return plan.configured&&plan.validFormat&&plan.verified&&plan.active&&plan.recurring&&plan.modeMatches});
  return Response.json({
    configured: status.keyConfigured && Object.values(status.plans).every(plan=>plan.configured&&plan.validFormat),
    ...status,checkoutReady,plans,
  }, { headers: { "Cache-Control": "no-store" } });
}
