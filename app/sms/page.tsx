import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Messaging | Pacifica CRM",
  description:
    "Opt in to receive SMS messages from Pacifica CRM and review our messaging disclosures.",
};

export default function SmsPage() {
  return (
    <main className="terms-page">
      <article>
        <span>PACIFICA CRM</span>
        <h1>SMS Messaging</h1>

        <p>
          Pacifica CRM offers conversational and informational SMS messaging
          for users who choose to communicate with us by text.
        </p>

        <h2>Opt in to SMS</h2>

        <p>
          To opt in to receive SMS messages from Pacifica CRM, text{" "}
          <strong>START</strong> to:
        </p>

        <p
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            margin: "24px 0",
          }}
        >
          +1 (XXX) XXX-XXXX
        </p>

        <p>
          By texting <strong>START</strong> to the number above, you consent to
          receive conversational and informational SMS messages from Pacifica
          CRM related to your requests, account, appointments, customer
          support, requested follow-ups, and service updates.
        </p>

        <p>
          Message frequency varies. Message and data rates may apply. Consent
          to receive SMS messages is not a condition of purchase.
        </p>

        <h2>Opt out</h2>

        <p>
          Reply <strong>STOP</strong> at any time to stop receiving SMS
          messages.
        </p>

        <h2>Help</h2>

        <p>
          Reply <strong>HELP</strong> for assistance or contact us at{" "}
          <a href="mailto:support@pacificacrm.com">
            support@pacificacrm.com
          </a>
          .
        </p>

        <h2>Privacy</h2>

        <p>
          Mobile information, including telephone numbers, SMS opt-in data,
          and SMS consent, will not be sold, rented, or shared with third
          parties or affiliates for their own marketing or promotional
          purposes.
        </p>

        <p>
          Carriers are not liable for delayed or undelivered messages.
        </p>

        <div className="legal-links">
          <Link href="/">← Return to Pacifica CRM</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </article>
    </main>
  );
}
