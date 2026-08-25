import CRMClient from "../CRMClient";
import { requireChatGPTUser } from "../chatgpt-auth";
import { requirePacificaAdminPage } from "../lib/clerk-access";

export const dynamic = "force-dynamic";

export default async function DashboardPage(){
  if(process.env.VERCEL){
    await requirePacificaAdminPage();
    return <CRMClient clerkEnabled/>;
  }
  await requireChatGPTUser("/dashboard");
  return <CRMClient/>;
}
