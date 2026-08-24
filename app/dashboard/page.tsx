import CRMClient from "../CRMClient";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage(){
  if(!process.env.VERCEL) await requireChatGPTUser("/dashboard");
  return <CRMClient/>;
}
