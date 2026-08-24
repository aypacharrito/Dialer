import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage(){
  const user=await getChatGPTUser();
  const vercelDemo=Boolean(process.env.VERCEL)&&!user;
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span><img src="/pacifica-mark.png" alt=""/></span><b>Pacifica</b></Link>
    <section className={styles.card}>
      <p className={styles.kicker}>SECURE WORKSPACE ACCESS</p>
      <h1>{user?`Welcome back, ${user.displayName}.`:"Sign in to your Pacifica workspace."}</h1>
      <p className={styles.copy}>Your contacts, calling setup, lead sources, quotes, and AI workspace stay behind one authenticated account.</p>
      {user||vercelDemo?<Link className={styles.primary} href="/dashboard">{vercelDemo?"Open demo workspace":"Open Pacifica"}</Link>:<a className={styles.primary} href={chatGPTSignInPath("/dashboard")}>Continue securely</a>}
      <div className={styles.divider}><span/>PRIVATE BETA<span/></div>
      <p className={styles.note}>{vercelDemo?"This Vercel build remains a private demo until customer authentication is connected. Do not store customer data here yet.":"New agency accounts are activated after subscription and onboarding. Calling numbers are assigned after verification."}</p>
      <Link className={styles.back} href="/">← Back to the Pacifica website</Link>
    </section>
    <footer>Protected access · Pacifica Insurance CRM</footer>
  </main>;
}
