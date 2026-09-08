"use client";

import {useRef} from "react";
import {useDialogFocus} from "../hooks/use-dialog-focus";

export default function WorkspaceLoadGate({failed}:{failed:boolean}){
  const dialogRef=useRef<HTMLElement>(null);
  useDialogFocus(dialogRef,true);
  return <div className="workspace-load-backdrop" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();event.stopPropagation()}}>
    <section ref={dialogRef} className="workspace-load-card" role="dialog" aria-modal="true" aria-label="Loading workspace" tabIndex={-1}>
      <span className="workspace-load-mark" aria-hidden="true">P</span>
      <div role="status"><h1>{failed?"Your workspace couldn’t load":"Opening your workspace"}</h1><p>{failed?"Check your connection and try again. No changes have been sent to your cloud workspace.":"Loading your contacts, calling queue, and settings…"}</p></div>
      {failed&&<button type="button" onClick={()=>window.location.reload()}>Retry</button>}
    </section>
  </div>;
}
