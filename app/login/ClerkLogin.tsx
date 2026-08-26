"use client";

import Link from "next/link";
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import styles from "./login.module.css";

export default function ClerkLogin(){
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={32} height={32} alt="" priority/></span><b>Pacifica</b></Link>
    <section className={`${styles.card} ${styles.clerkCard}`}>
      <p className={styles.kicker}>SECURE WORKSPACE ACCESS</p>
      <h1>Sign in to Pacifica.</h1>
      <p className={styles.copy}>The Pacifica owner has permanent access. Subscriber accounts open after Stripe confirms an active plan.</p>
      <SignIn routing="hash" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" appearance={{elements:{rootBox:{width:"100%"},card:{boxShadow:"none",border:"0",padding:"0",width:"100%"},headerTitle:{display:"none"},headerSubtitle:{display:"none"},socialButtonsBlockButton:{borderColor:"#d4dcda"},formButtonPrimary:{backgroundColor:"#14313c"}}}}/>
      <Link className={styles.back} href="/">← Back to the Pacifica website</Link>
    </section>
    <footer>Protected by Clerk · Pacifica</footer>
  </main>;
}
