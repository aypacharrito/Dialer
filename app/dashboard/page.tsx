import CRMClient from "../CRMClient";
import { requireChatGPTUser } from "../chatgpt-auth";
import { requirePacificaWorkspacePage } from "../lib/clerk-access";
import { isClerkConfigured } from "../lib/clerk-config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage(){
  if(isClerkConfigured()){
    const access=await requirePacificaWorkspacePage();
    return <CRMClient clerkEnabled isOwner={access.role==="owner"} workspaceId={access.userId}/>;
  }
  if(process.env.VERCEL)redirect("/login?error=auth_not_configured");
  await requireChatGPTUser("/dashboard");
  return <CRMClient/>;
}
