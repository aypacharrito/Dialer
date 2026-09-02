import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Pacifica CRM",
  description:
    "How Pacifica CRM collects, uses, protects, and discloses information, including SMS consent data.",
};

export default function PrivacyPage() {
  return (
    <main className="terms-page">
      <article>
        <span>PACIFICA CRM</span>
        <h1>Privacy Policy</h1>
        <p className="terms-updated">Effective September 1, 2026</p>

        <p>
          This Privacy Policy explains how <strong>Pacifica CRM</strong>
          collects, uses, discloses, and protects information when you visit
          pacificacrm.com, create an account, use our services, request
          information, or communicate with Pacifica CRM.
        </p>

        <h2>1. Information we collect</h2>

        <p>
          We may collect names, email addresses, mobile telephone numbers,
          account and business information, subscription information, device
          and usage information, customer-support communications, and records
          users choose to store in Pacifica CRM.
        </p>

        <p>
          When communications features are used, we may process telephone
          numbers, email addresses, message content, call and message
          metadata, SMS consent status, opt-out status, and related
          communication records.
        </p>

        <h2>2. How we use information</h2>

        <p>
          We use information to provide, secure, support, and improve Pacifica
          CRM; authenticate users; process subscriptions; respond to requests;
          provide requested communications; maintain consent and suppression
          records; prevent abuse; troubleshoot services; and comply with legal
          and carrier requirements.
        </p>

        <h2>3. SMS Privacy and Consent</h2>

        <p>
          <strong>
            Pacifica CRM does not sell, rent, share, or disclose mobile
            telephone numbers, SMS opt-in data, or SMS consent to third
            parties or affiliates for their own marketing or promotional
            purposes.
          </strong>
        </p>

        <p>
          Text messaging originator opt-in data and consent are excluded from
          any sharing with third parties or affiliates for marketing or
          promotional purposes.
        </p>

        <p>
          Mobile information may be disclosed only to service providers that
          help Pacifica CRM operate and deliver its messaging program, when
          required by law, or when necessary to protect rights, safety,
          security, or the integrity of our services.
        </p>

        <p>
          If you opt in to Pacifica CRM SMS messages, message frequency
          varies based on your requests and interactions with us. Message and
          data rates may apply.
        </p>

        <p>
          Reply <strong>STOP</strong> at any time to opt out. Reply{" "}
          <strong>HELP</strong> for assistance.
        </p>

        <p>
          Consent to receive SMS messages is not a condition of purchase.
        </p>

        <p>
          Information about our SMS opt-in process is available on the{" "}
          <Link href="/sms">Pacifica CRM SMS Messaging page</Link>.
        </p>

        <h2>4. How we disclose information</h2>

        <p>
          We may disclose information to service providers that provide
          communications, hosting, identity, payments, analytics, security,
          and customer-support services under appropriate restrictions.
        </p>

        <p>
          We may also disclose information when required by law, valid legal
          process, or when reasonably necessary to investigate fraud, abuse,
          security threats, or violations of our Terms.
        </p>

        <p>We do not sell personal information for money.</p>

        <h2>5. Customer-controlled records</h2>

        <p>
          Businesses using Pacifica CRM control the contact and lead records
          they upload and communications they initiate. Those businesses are
          responsible for their own privacy notices, consent collection, and
          lawful use of personal information.
        </p>

        <h2>6. Data retention</h2>

        <p>
          We retain information for as long as reasonably necessary to
          provide the service, maintain business and compliance records,
          resolve disputes, enforce agreements, and satisfy legal
          obligations.
        </p>

        <h2>7. Security</h2>

        <p>
          We use reasonable administrative, technical, and organizational
          safeguards designed to protect information. No transmission or
          storage system can be guaranteed to be completely secure.
        </p>

        <h2>8. Your choices and rights</h2>

        <p>
          Depending on where you live, you may have rights concerning access,
          correction, or deletion of certain personal information. You may
          also unsubscribe from marketing email and reply STOP to SMS
          messages.
        </p>

        <h2>9. Cookies</h2>

        <p>
          Pacifica CRM and its service providers may use cookies and similar
          technologies for authentication, security, preferences,
          performance, and service operation.
        </p>

        <h2>10. Children</h2>

        <p>
          Pacifica CRM is a business service and is not directed to children
          under 13.
        </p>

        <h2>11. Policy updates</h2>

        <p>
          We may update this Privacy Policy to reflect changes in our
          services, practices, or legal obligations. Revised policies will be
          posted on this page.
        </p>

        <h2>12. Contact</h2>

        <p>
          Privacy questions may be sent to{" "}
          <a href="mailto:privacy@pacificacrm.com">
            privacy@pacificacrm.com
          </a>
          . SMS and general support questions may be sent to{" "}
          <a href="mailto:support@pacificacrm.com">
            support@pacificacrm.com
          </a>
          .
        </p>

        <div className="legal-links">
          <Link href="/">← Return to Pacifica CRM</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/sms">SMS Messaging</Link>
        </div>
      </article>
    </main>
  );
}
