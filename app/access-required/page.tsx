import Link from "next/link";
import Image from "next/image";
import styles from "../login/login.module.css";

export const dynamic="force-dynamic";

export default function AccessRequiredPage(){
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={32} height={32} alt="" priority/></span><b>Pacifica</b></Link>
    <section className={styles.card}>
      <p className={styles.kicker}>WORKSPACE ACCESS</p>
      <h1>Your workspace needs access.</h1>
      <p className={styles.copy}>Your account is signed in, but access is paused or no active trial or subscription was found. Ask the workspace administrator to check your access. To subscribe, use the same email address as this sign-in.</p>
      <Link className={styles.primary} href="/#pricing">Choose a Pacifica plan</Link>
      <Link className={styles.back} href="/">← Back to the Pacifica website</Link>
    </section>
    <footer>Secure subscription access · Pacifica</footer>
  </main>;
}
