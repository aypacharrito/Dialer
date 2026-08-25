import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const PACIFICA_ADMIN_EMAIL="pacificalegalinsurance@gmail.com";

async function isAllowedClerkUser(){
  const {userId}=await auth();
  if(!userId)return false;
  const user=await currentUser();
  return Boolean(user?.emailAddresses.some(item=>item.emailAddress.toLowerCase()===PACIFICA_ADMIN_EMAIL));
}

export async function requirePacificaAdminPage(){
  const {userId}=await auth();
  if(!userId)redirect("/login");
  if(!await isAllowedClerkUser())redirect("/login?error=unauthorized");
}

export async function isPacificaAdminApi(){
  if(!process.env.VERCEL)return true;
  return isAllowedClerkUser();
}
