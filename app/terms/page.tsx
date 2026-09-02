import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Pacifica CRM",
  description:
    "Terms governing Pacifica CRM, including its calling and SMS messaging services.",
};

export default function TermsPage() {
  return (
    <main className="terms-page">
      <article>
        <span>PACIFICA CRM</span>
        <h1>Terms of Service</h1>
        <p className="terms-updated">Effective September 1, 2026</p>

        <p>
          These Terms of Service govern access to and use of{" "}
          <strong>Pacifica CRM</strong>, including its lead-management,
          calling, messaging, scheduling, reporting, and related services.
          By using Pacifica CRM, you agree to these Terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>1. Eligibility and accounts</h2>
        <p>
          You must be legally able to enter into a binding agreement and
          provide accurate account and business information. You are
          responsible for protecting your credentials and all activity
          performed through your account.
        </p>

        <h2>2. Authorized business use</h2>
        <p>
          Pacifica CRM is intended for legitimate business communications by
          authorized users. Users are responsible for complying with laws,
          regulations, carrier requirements, professional licensing rules,
          and consent requirements applicable to their communications.
        </p>

        <h2>3. Calling and messaging consent</h2>
        <p>
          Users may contact a person through Pacifica CRM only when they have
          a lawful basis and any required consent. Users must maintain
          appropriate consent records and promptly honor Do Not Call and SMS
          opt-out requests.
        </p>

        <h2>4. Pacifica CRM SMS Messaging Program</h2>

        <p>
          The <strong>Pacifica CRM SMS Messaging Program</strong> provides
          conversational and informational text messages to people who have
          affirmatively opted in to receive SMS communications from Pacifica
          CRM.
        </p>

        <p>
          Messages may include responses to inquiries, requested information,
          account or service updates, appointment scheduling or
          confirmations, requested follow-ups, and customer-support
          communications.
        </p>

        <p>
          Users may opt in by texting <strong>START</strong> to the Pacifica
          CRM business number displayed on our{" "}
          <Link href="/sms">SMS Messaging page</Link>.
        </p>

        <p>
          <strong>Message frequency varies.</strong> Message and data rates
          may apply. Consent to receive SMS messages is not a condition of
          purchase.
        </p>

        <p>
          <strong>
            Reply STOP at any time to opt out. Reply HELP for assistance.
          </strong>
        </p>

        <p>
          You may also contact Pacifica CRM at{" "}
          <a href="mailto:support@pacificacrm.com">
            support@pacificacrm.com
          </a>
          .
        </p>

        <p>
          <strong>
            Carriers are not liable for delayed or undelivered messages.
          </strong>
        </p>

        <p>
          Please review our{" "}
          <Link href="/privacy">Privacy Policy</Link> for information about
          how mobile information and SMS consent are handled.
        </p>

        <h2>5. Calling practices</h2>
        <p>
          Users must comply with applicable calling laws, including the
          Telephone Consumer Protection Act, Telemarketing Sales Rule,
          applicable state laws, calling-hour restrictions,
          caller-identification requirements, and carrier rules.
        </p>

        <h2>6. Recording and automated features</h2>
        <p>
          Before recording, transcribing, monitoring, or analyzing a
          communication, users must provide all legally required disclosures
          and obtain any required consent.
        </p>

        <h2>7. Customer data and acceptable use</h2>
        <p>
          Users may upload only data they are authorized to possess and
          process. Pacifica CRM may not be used for fraud, harassment,
          impersonation, misleading caller identification, prohibited
          content, spam, or attempts to bypass compliance or security
          controls.
        </p>

        <h2>8. Third-party services</h2>
        <p>
          Pacifica CRM may use third-party providers for communications,
          identity, payments, hosting, security, and other functions.
          Availability or delivery through outside networks and carriers
          cannot be guaranteed.
        </p>

        <h2>9. Fees and subscriptions</h2>
        <p>
          Paid features are billed according to the plan and pricing
          presented at checkout. Communication usage, carrier fees, taxes,
          and optional integrations may be charged separately.
        </p>

        <h2>10. Service availability</h2>
        <p>
          Pacifica CRM is provided on an “as available” basis. We do not
          guarantee uninterrupted availability, message deliverability,
          regulatory compliance for a user&apos;s specific business, or any
          particular business result.
        </p>

        <h2>11. Changes and termination</h2>
        <p>
          We may update these Terms to reflect changes in our services,
          practices, legal obligations, or carrier requirements. Revised
          Terms will be posted on this page.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these Terms or the Pacifica CRM SMS Messaging
          Program may be sent to{" "}
          <a href="mailto:support@pacificacrm.com">
            support@pacificacrm.com
          </a>
          .
        </p>

        <div className="legal-links">
          <Link href="/">← Return to Pacifica CRM</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/sms">SMS Messaging</Link>
        </div>
      </article>
    </main>
  );
}
