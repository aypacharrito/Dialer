import CRMClient from "../CRMClient";
import { requireChatGPTUser } from "../chatgpt-auth";
import { requirePacificaAdminPage } from "../lib/clerk-access";
import { isClerkConfigured } from "../lib/clerk-config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage(){
  if(isClerkConfigured()){
    await requirePacificaAdminPage();
    return <CRMClient clerkEnabled/>;
  }
  if(process.env.VERCEL)redirect("/login?error=auth_not_configured");
  await requireChatGPTUser("/dashboard");
  return <CRMClient/>;
}
