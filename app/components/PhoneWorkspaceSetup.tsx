"use client";

export default function PhoneWorkspaceSetup({phoneNumber,workspaceId}:{phoneNumber:string;workspaceId:string}){
  const assigned=phoneNumber.startsWith("+");
  const mapping=assigned?JSON.stringify({[phoneNumber]:workspaceId}):"Assign a Twilio number to this workspace first";
  return <section className="phone-workspace-setup">
    <header><div><span>MULTI-TENANT PHONE ROUTING</span><h2>One private number per workspace</h2></div><strong className={assigned?"ready":"waiting"}>{assigned?"NUMBER ASSIGNED":"ASSIGN NUMBER"}</strong></header>
    <p>Pacifica isolates calling and messaging by Clerk workspace. Add this entry to the <b>TWILIO_NUMBER_WORKSPACE_MAP</b> JSON in Vercel, then set that Twilio number’s incoming Voice webhook to <b>https://pacificacrm.com/api/twilio/voice</b> using HTTP POST.</p>
    <div><code>{mapping}</code><button disabled={!assigned} onClick={()=>void navigator.clipboard.writeText(mapping)}>Copy mapping</button></div>
    <small>The web softphone receives calls while Pacifica is open and “Go available” is active. Set TWILIO_AUTH_TOKEN and TWILIO_WEBHOOK_BASE_URL=https://pacificacrm.com in Vercel to validate every Twilio webhook. A later native app will add background calling through iOS CallKit and Android Telecom.</small>
  </section>;
}
