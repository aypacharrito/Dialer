"use client";

export default function PhoneWorkspaceSetup({phoneNumber,workspaceId}:{phoneNumber:string;workspaceId:string}){
  const assigned=phoneNumber.startsWith("+");
  return <section className="phone-workspace-setup">
    <header><div><span>MULTI-TENANT PHONE ROUTING</span><h2>One private number per workspace</h2></div><strong className={assigned?"ready":"waiting"}>{assigned?"NUMBER ASSIGNED":"ASSIGN NUMBER"}</strong></header>
    <p>{assigned?<><b>{phoneNumber}</b> is privately assigned to this Clerk workspace for caller ID, inbound calls, and messages.</>:"Use the Pacifica Phone Number Center to assign a Twilio number. No Vercel variable or redeployment is required per customer."}</p>
    <div><code>Workspace: {workspaceId}</code><button disabled={!assigned} onClick={()=>void navigator.clipboard.writeText(workspaceId)}>Copy workspace ID</button></div>
    <small>The web softphone receives calls while Pacifica is open and “Go available” is active. SMS requires a customer-specific A2P registration before carrier delivery.</small>
  </section>;
}
