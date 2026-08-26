import Link from "next/link";
import Image from "next/image";
import styles from "../login/login.module.css";

export const dynamic="force-dynamic";

export default function AccessRequiredPage(){
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span><Image src="/pacifica-mark.png" width={32} height={32} alt="" priority/></span><b>Pacifica</b></Link>
    <section className={styles.card}>
      <p className={styles.kicker}>SUBSCRIPTION REQUIRED</p>
      <h1>Activate Pacifica to open the CRM.</h1>
      <p className={styles.copy}>Your account is signed in, but it does not have an active Pacifica subscription. Choose a plan using the same email address connected to this account.</p>
      <Link className={styles.primary} href="/#pricing">Choose a Pacifica plan</Link>
      <Link className={styles.back} href="/">← Back to the Pacifica website</Link>
    </section>
    <footer>Secure subscription access · Pacifica</footer>
  </main>;
}
