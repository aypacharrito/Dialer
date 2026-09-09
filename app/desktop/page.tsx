import { requirePacificaWorkspacePage } from "../lib/clerk-access";

export default async function DesktopDownloadPage(){
  const access=await requirePacificaWorkspacePage();
  return <main style={{maxWidth:760,margin:"64px auto",padding:"0 24px",fontFamily:"system-ui,sans-serif"}}>
    <p style={{fontWeight:800,letterSpacing:".08em",fontSize:12}}>PACIFICA DESKTOP</p>
    <h1 style={{fontSize:42,lineHeight:1.05,margin:"8px 0 16px"}}>Your call workspace, above everything else.</h1>
    <p style={{fontSize:18,lineHeight:1.6,color:"#4b5563"}}>Signed in as {access.email}. The desktop build uses the same Pacifica account, CRM, calling, messages, and subscription access as the web app. During a call it can switch into a compact always-on-top overlay so you can work in carrier portals, PDFs, dealership systems, or other apps without losing the call controls.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:28}}>
      <a href="/api/desktop/download?platform=windows" style={{padding:"14px 18px",borderRadius:12,background:"#111827",color:"white",textDecoration:"none",fontWeight:800}}>Download for Windows</a>
      <a href="/api/desktop/download?platform=mac" style={{padding:"14px 18px",borderRadius:12,border:"1px solid #d1d5db",color:"#111827",textDecoration:"none",fontWeight:800}}>Download for macOS</a>
      <a href="/dashboard" style={{padding:"14px 18px",color:"#374151",textDecoration:"none",fontWeight:700}}>Back to Pacifica</a>
    </div>
    <p style={{marginTop:24,fontSize:13,color:"#6b7280"}}>Official installers are served only after Pacifica verifies workspace access. The app itself also loads the subscription-protected Pacifica workspace, so an installer copied to another computer does not bypass account access.</p>
  </main>;
}
