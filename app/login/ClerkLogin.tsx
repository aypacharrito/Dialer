"use client";

import Link from "next/link";
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import styles from "./login.module.css";

export default function ClerkLogin(){
  return <main className={styles.page}>
    <section className={`${styles.card} ${styles.clerkCard}`}>
      <header className={styles.loginHeader}>
        <Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={34} height={34} alt="" priority/></span><b>PACIFICA</b></Link>
        <div><p className={styles.kicker}>PACIFICA CRM</p><h1>Every lead.<br/>Fully worked.</h1></div>
        <Link className={styles.back} href="/">← Pacifica home</Link>
      </header>
      <div className={styles.authPanel}>
        <div className={styles.authIntro}><p className={styles.kicker}>SECURE ACCESS</p><h2>Welcome back</h2></div>
        <SignIn routing="hash" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" appearance={{variables:{colorPrimary:"#0b8065",colorBackground:"#ffffff",borderRadius:"10px",fontFamily:"Inter, ui-sans-serif, system-ui, sans-serif"},elements:{rootBox:{width:"100%"},card:{boxShadow:"none",border:"0",padding:"0",width:"100%",background:"transparent",color:"#17342b"},headerTitle:{display:"none"},headerSubtitle:{display:"none"},socialButtonsBlockButton:{borderColor:"#d6e3de",height:"46px",boxShadow:"none",backgroundColor:"#ffffff"},formFieldInput:{height:"46px",borderColor:"#d6e3de",boxShadow:"none",backgroundColor:"#f7faf8",color:"#17342b"},formButtonPrimary:{height:"46px",backgroundColor:"#0b8065",boxShadow:"none"},footer:{background:"transparent"}}}}/>
      </div>
    </section>
  </main>;
}
