import CRMClient from "../CRMClient";
import { requireChatGPTUser } from "../chatgpt-auth";
import { isPacificaPlatformOwnerEmail, requirePacificaWorkspacePage } from "../lib/clerk-access";
import { isClerkConfigured } from "../lib/clerk-config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage(){
  if(isClerkConfigured()){
    const access=await requirePacificaWorkspacePage();
    return <CRMClient clerkEnabled isOwner={access.role==="owner"||access.role==="manager"} isPlatformOwner={isPacificaPlatformOwnerEmail(access.email)} workspaceId={access.userId} currentUserName={access.displayName} currentUserEmail={access.email} userRole={access.role}/>;
  }
  if(process.env.VERCEL)redirect("/login?error=auth_not_configured");
  await requireChatGPTUser("/dashboard");
  return <CRMClient/>;
}
