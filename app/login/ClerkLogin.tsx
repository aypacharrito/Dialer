"use client";

import Link from "next/link";
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import styles from "./login.module.css";

export default function ClerkLogin(){
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={32} height={32} alt="" priority/></span><b>Pacifica</b></Link>
    <section className={`${styles.card} ${styles.clerkCard}`}>
      <header className={styles.loginHeader}><p className={styles.kicker}>PACIFICA CRM</p><h1>Welcome back.</h1><p className={styles.copy}>Sign in to continue to your workspace.</p></header>
      <SignIn routing="hash" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" appearance={{variables:{colorPrimary:"#0c7d65",borderRadius:"10px",fontFamily:"Inter, ui-sans-serif, system-ui, sans-serif"},elements:{rootBox:{width:"100%"},card:{boxShadow:"none",border:"0",padding:"0",width:"100%",background:"transparent"},headerTitle:{display:"none"},headerSubtitle:{display:"none"},socialButtonsBlockButton:{borderColor:"#d8e4df",height:"46px",boxShadow:"none"},formFieldInput:{height:"46px",borderColor:"#d8e4df",boxShadow:"none"},formButtonPrimary:{height:"46px",backgroundColor:"#0c7d65",boxShadow:"none"},footer:{background:"transparent"}}}}/>
      <Link className={styles.back} href="/">← Back to the Pacifica website</Link>
    </section>
    <footer>Protected by Clerk · Pacifica</footer>
  </main>;
}
