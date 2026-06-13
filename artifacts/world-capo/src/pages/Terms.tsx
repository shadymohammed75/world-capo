import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/site";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service ("Terms") govern your use of {SITE.name} (the "Service"), operated by
        {" "}{SITE.company}. By using the Service or placing a flag, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        {SITE.name} lets you place your nation's flag on a shared digital "fan wall" celebrating the
        World Cup 2026. Placing a flag is currently <strong>free</strong>. The Service is a novelty
        entertainment product and is <strong>not affiliated with, endorsed by, or sponsored by any
        official football body or competition organiser</strong>.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful or fraudulent purpose.</li>
        <li>Attempt to disrupt, overload, or gain unauthorised access to the Service.</li>
        <li>Use automated means to place flags or manipulate the wall.</li>
      </ul>
      <p>We may remove flags or restrict access where these Terms are breached.</p>

      <h2>3. Intellectual property</h2>
      <p>
        Flag emojis and national symbols belong to their respective owners. The {SITE.name} name,
        design, and software are owned by {SITE.company}. Placing a flag grants you a personal,
        non-exclusive right to have that flag displayed on the wall; it does not transfer any ownership.
      </p>

      <h2>4. Availability</h2>
      <p>
        We aim to keep the Service available but do not guarantee uninterrupted access. The wall and any
        placed flags are provided for the duration of the World Cup 2026 event and may be taken down
        afterwards.
      </p>

      <h2>5. Disclaimer &amp; limitation of liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To the maximum extent permitted
        by law, {SITE.company} is not liable for any indirect or consequential loss arising from your use
        of the Service.
      </p>

      <h2>6. Privacy</h2>
      <p>
        Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>, which
        explains how we handle your data.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes take
        effect constitutes acceptance of the revised Terms.
      </p>
    </LegalLayout>
  );
}
