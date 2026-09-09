import { requirePacificaWorkspacePage } from "../lib/clerk-access";

export default async function DesktopDownloadPage(){
  const access=await requirePacificaWorkspacePage();
  return <main className="desktop-download-page">
    <section className="desktop-download-hero">
      <span>PACIFICA DESKTOP</span>
      <h1>Your CRM stays open. Your call controls stay above everything.</h1>
      <p>Signed in as <b>{access.email}</b>. The Windows app uses the same Pacifica account, CRM, Twilio calling, messages, and subscription access as the web version. During a call, a separate native controller stays always on top while the full CRM remains open.</p>
      <div className="desktop-download-actions">
        <a className="desktop-primary" href="/api/desktop/download?platform=windows">Download Pacifica for Windows</a>
        <a className="desktop-secondary" href="/dashboard">Back to Pacifica</a>
      </div>
      <small>The app installer does not contain your Twilio or OpenAI secrets. Signing in to an active Pacifica account is still required after installation.</small>
    </section>
    <section className="desktop-feature-grid">
      <article><b>Native call overlay</b><p>Mute, DTMF keypad, queue pause, open CRM, and end-call controls in a separate always-on-top window.</p></article>
      <article><b>Same workspace</b><p>No duplicate database. Web and desktop use the same account-scoped Pacifica records.</p></article>
      <article><b>Paid access enforced</b><p>This page and download route require Pacifica workspace access; the installed app still requires sign-in.</p></article>
    </section>
  </main>;
}
