"use client";

import {useState} from "react";

export default function PhoneWorkspaceSetup({phoneNumber,workspaceId}:{phoneNumber:string;workspaceId:string}){
  const assigned=phoneNumber.startsWith("+");
  const [copyStatus,setCopyStatus]=useState("");
  async function copyWorkspace(){
    try{await navigator.clipboard.writeText(workspaceId);setCopyStatus("Workspace ID copied")}
    catch{setCopyStatus("Could not copy. Select the workspace ID below and copy it manually.")}
  }
  return <section className="phone-workspace-setup">
    <header><div><span>WORKSPACE NUMBER</span><h2>{assigned?phoneNumber:"Assign a phone number"}</h2></div><strong className={assigned?"ready":"waiting"}>{assigned?"ASSIGNED":"SETUP NEEDED"}</strong></header>
    {!assigned&&<p>Choose a number in the Phone Number Center to enable calling.</p>}
    <details className="integration-details"><summary>Workspace details</summary><div className="workspace-copy-row"><code>{workspaceId}</code><button type="button" onClick={()=>void copyWorkspace()}>Copy workspace ID</button></div><p role="status">{copyStatus}</p></details>
  </section>;
}
