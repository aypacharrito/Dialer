"use client";

import Image from "next/image";
import {useRef} from "react";
import {useDialogFocus} from "../hooks/use-dialog-focus";
import type {WorkspaceLoadError} from "../lib/workspace-load";

export default function WorkspaceLoadGate({error,onRetry}:{error:WorkspaceLoadError|null;onRetry:()=>void}){
  const dialogRef=useRef<HTMLElement>(null);
  useDialogFocus(dialogRef,true);
  return <div className="workspace-load-backdrop" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();event.stopPropagation()}}>
    <section ref={dialogRef} className="workspace-load-card" role="dialog" aria-modal="true" aria-label="Loading workspace" tabIndex={-1}>
      <Image className="workspace-load-mark" src="/pacifica-mark.png" width={48} height={48} alt="" priority/>
      <div role="status"><h1>{error?"Your workspace couldn’t load":"Opening your workspace"}</h1><p>{error?error.message:"Loading your contacts, calling queue, and settings…"}</p></div>
      {error&&<>
        <p>No changes have been sent to your cloud workspace.</p>
        {error.code==="SIGN_IN_REQUIRED"?<a className="workspace-load-action" href="/login">Sign in again</a>
          :error.code==="ACCESS_REQUIRED"?<a className="workspace-load-action" href="/access-required">Check account access</a>
          :<button type="button" onClick={onRetry}>Retry</button>}
        <details className="workspace-load-details"><summary>Error details</summary><code>{error.code}{error.status?` · HTTP ${error.status}`:""}{error.requestId?<><br/>Reference: {error.requestId}</>:null}</code></details>
      </>}
    </section>
  </div>;
}
