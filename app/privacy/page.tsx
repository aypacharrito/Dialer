import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Pacifica CRM",
  description: "How Pacifica CRM collects, uses, protects, and discloses information.",
};

export default function PrivacyPage() {
  return <main className="terms-page"><article>
    <span>PACIFICA CRM</span><h1>Privacy Policy</h1><p className="terms-updated">Effective September 1, 2026</p>
    <p>This Privacy Policy explains how Pacifica CRM collects, uses, discloses, and protects information when you visit pacificacrm.com, create an account, use our lead-management and communications tools, or communicate with us.</p>
    <h2>1. Information we collect</h2><p>We may collect account and business information, contact details, subscription and transaction information, device and usage information, support communications, and the customer records you choose to store in the service. When communications features are used, we may process telephone numbers, email addresses, message content, call and message metadata, consent status, opt-out status, recordings, or transcripts when enabled.</p>
    <h2>2. How we use information</h2><p>We use information to provide, secure, support, and improve Pacifica CRM; authenticate users; process subscriptions; route requested communications; maintain consent and suppression records; prevent abuse; troubleshoot performance; respond to support requests; and meet legal and carrier requirements.</p>
    <h2>3. SMS privacy and consent</h2><p>Mobile information, including telephone numbers, SMS opt-in data, and SMS consent, will not be sold, rented, or shared with third parties or affiliates for their own marketing or promotional purposes. We may disclose this information only to service providers that help us deliver the messaging program, when required by law, or to protect rights, safety, and security. SMS consent is specific to the sender and is not transferred to another business.</p><p>If you opt in to Pacifica CRM text messages, message frequency varies and message and data rates may apply. You may reply STOP at any time to opt out or HELP for assistance. Opting out of promotional texts does not prevent necessary non-promotional communications where permitted by law.</p>
    <h2>4. How we disclose information</h2><p>We may disclose information to vendors that provide communications, hosting, identity, payments, analytics, security, and customer-support services under appropriate restrictions. We may also disclose information in connection with a business transaction, to comply with law or valid legal process, or to investigate fraud, abuse, security threats, or violations of our Terms. We do not sell personal information for money.</p>
    <h2>5. Customer-controlled records</h2><p>Businesses using Pacifica CRM control the contact and lead records they upload and the communications they initiate. Those businesses are responsible for their own privacy notices, consent collection, and lawful use of personal information. Requests concerning a business customer’s records should generally be directed to that business first.</p>
    <h2>6. Data retention</h2><p>We retain information for as long as reasonably necessary to provide the service, maintain business and compliance records, resolve disputes, enforce agreements, and satisfy legal obligations. Retention periods vary according to the type of information and the reason it is processed.</p>
    <h2>7. Security</h2><p>We use reasonable administrative, technical, and organizational safeguards designed to protect information. No transmission or storage system is completely secure, and we cannot guarantee absolute security. Account holders are responsible for maintaining strong credentials and limiting access to authorized users.</p>
    <h2>8. Your choices and rights</h2><p>Depending on where you live, you may have rights to request access, correction, deletion, or information about certain uses and disclosures of your personal information. You may also manage account information, unsubscribe from marketing email, and reply STOP to text messages. We may need to verify your identity before completing a request, and legal exceptions may apply.</p>
    <h2>9. Cookies and online services</h2><p>Pacifica CRM and its service providers may use cookies and similar technologies that are necessary for authentication, security, preferences, performance, and service operation. Browser settings may allow you to restrict some cookies, although doing so may affect functionality.</p>
    <h2>10. Children</h2><p>Pacifica CRM is a business service and is not directed to children under 13. We do not knowingly collect personal information directly from children under 13 through the service.</p>
    <h2>11. Policy updates</h2><p>We may update this Privacy Policy to reflect changes in our services, practices, or legal obligations. We will post the revised policy on this page and update the effective date.</p>
    <h2>12. Contact us</h2><p>Privacy questions and requests may be sent to <a href="mailto:privacy@pacificacrm.com">privacy@pacificacrm.com</a>.</p>
    <div className="legal-links"><Link href="/">← Return to Pacifica</Link><Link href="/terms">Terms of Service</Link></div>
  </article></main>;
}
