import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/site";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how {SITE.company} ("we", "us") collects, uses, and protects
        your information when you use {SITE.name} (the "Service"). We are committed to handling your
        data lawfully and transparently in line with the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Email address</strong> (optional) — only if you provide one, to send your payment receipt.</li>
        <li><strong>IP address</strong> — collected for fraud prevention and stored only as a one-way <strong>SHA-256 hash</strong>, never in readable form.</li>
        <li><strong>Payment information</strong> — card details are entered directly into our payment provider (Stripe) and are <strong>never seen or stored</strong> by us.</li>
        <li><strong>Flag placements</strong> — the nation you choose and the coordinates of your flag. This contains no personal data.</li>
        <li><strong>Consent &amp; session data</strong> — a randomly generated session identifier and your cookie preferences, stored in your browser.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To process your payment and place your flag on the wall.</li>
        <li>To send a receipt to the email you provide.</li>
        <li>To prevent fraud and abuse of the Service.</li>
        <li>To understand aggregate usage (only with your consent).</li>
      </ul>

      <h2>3. Legal basis (GDPR)</h2>
      <ul>
        <li><strong>Performance of a contract</strong> — to process your flag purchase.</li>
        <li><strong>Legitimate interests</strong> — to keep the Service secure and prevent fraud.</li>
        <li><strong>Consent</strong> — for optional analytics and non-essential cookies, which you can decline.</li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>We do not sell your data. We share the minimum necessary with trusted processors:</p>
      <ul>
        <li><strong>Stripe</strong> — to process payments securely (see Stripe's own privacy policy).</li>
        <li><strong>Our hosting and database providers</strong> — to operate the Service.</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use only essential cookies and browser storage needed to run the Service and remember your
        consent choice. Analytics or marketing cookies are used only if you select "Accept All" in our
        cookie banner. You can change your choice at any time by clearing your browser storage.
      </p>

      <h2>6. Data retention</h2>
      <p>
        Hashed payment and consent records are retained as long as necessary for accounting, tax, and
        fraud-prevention purposes, then deleted or anonymised. Flag placements remain on the wall for
        the duration of the World Cup 2026 event.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the GDPR you have the right to access, correct, or erase your personal data, to restrict or object to processing, and to data portability. To exercise the right to erasure, contact us with the email address you used and we will anonymise the personal data associated with it. Flags placed remain on the wall as they contain no personal data.</p>

      <h2>8. Security</h2>
      <p>
        We protect data in transit with HTTPS, store all identifiers as one-way hashes, and never hold
        card data ourselves. No method of transmission is 100% secure, but we take reasonable measures
        to safeguard your information.
      </p>

      <h2>9. Contact</h2>
      <p>
        For any privacy request or question, contact us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </LegalLayout>
  );
}
