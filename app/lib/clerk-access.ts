import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "./clerk-config";
import { getStripe } from "./stripe";

export const PACIFICA_ADMIN_EMAIL="pacificalegalinsurance@gmail.com";
const paidStatuses=new Set(["active","trialing"]);

async function getClerkIdentity(){
  const {userId}=await auth();
  if(!userId)return null;
  const user=await currentUser();
  if(!user)return null;
  const email=(user.primaryEmailAddress?.emailAddress||user.emailAddresses[0]?.emailAddress||"").toLowerCase();
  return email?{userId,email}:null;
}

async function hasPaidSubscription(email:string){
  try{
    const stripe=getStripe();
    const customers=await stripe.customers.list({email,limit:10});
    for(const customer of customers.data){
      const subscriptions=await stripe.subscriptions.list({customer:customer.id,status:"all",limit:20});
      if(subscriptions.data.some(subscription=>paidStatuses.has(subscription.status)))return true;
    }
  }catch(error){
    console.error("[access] subscription verification failed",error instanceof Error?error.message:"unknown error");
  }
  return false;
}

export async function getPacificaAccess(){
  const identity=await getClerkIdentity();
  if(!identity)return {allowed:false,role:"signed-out" as const,email:""};
  if(identity.email===PACIFICA_ADMIN_EMAIL)return {allowed:true,role:"owner" as const,email:identity.email};
  if(await hasPaidSubscription(identity.email))return {allowed:true,role:"subscriber" as const,email:identity.email};
  return {allowed:false,role:"subscription-required" as const,email:identity.email};
}

export async function requirePacificaWorkspacePage(){
  const access=await getPacificaAccess();
  if(access.role==="signed-out")redirect("/login");
  if(!access.allowed)redirect("/access-required");
  return access;
}

export async function hasPacificaWorkspaceApiAccess(){
  if(!isClerkConfigured())return !process.env.VERCEL;
  return (await getPacificaAccess()).allowed;
}

export async function isPacificaOwnerApi(){
  if(!isClerkConfigured())return !process.env.VERCEL;
  return (await getPacificaAccess()).role==="owner";
}
