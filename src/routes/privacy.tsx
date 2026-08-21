import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildSeoHead({
      title: "Privacy Policy",
      description:
        "How NepARENA collects, uses, and protects your personal data. Includes cookies and advertising partners.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <ContentPageShell title="Privacy Policy" subtitle="Last updated: August 21, 2026" icon={Shield}>
      <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
        <p>
          NepARENA (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates <strong className="text-white">https://neparena.xyz</strong>.
          This Privacy Policy explains what information we collect, how we use it, and your choices.
          By using NepARENA you agree to this policy.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">1. Information we collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-neutral-400">
            <li>Account data: email, username, display name, avatar, and profile details you provide.</li>
            <li>Tournament activity: registrations, results submissions, messages to organizers, posts and comments.</li>
            <li>Technical data: IP address, device/browser type, approximate location, pages viewed, and usage logs.</li>
            <li>Cookies and similar technologies used for login sessions, preferences, analytics, and advertising.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">2. How we use information</h2>
          <ul className="list-disc space-y-1 pl-5 text-neutral-400">
            <li>Provide and improve tournaments, profiles, messaging, and community features.</li>
            <li>Secure accounts, prevent abuse, and enforce community rules.</li>
            <li>Send important service notices (e.g. match times, security alerts).</li>
            <li>Measure traffic and performance (analytics).</li>
            <li>Show relevant ads through partners such as Google AdSense (when enabled).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">3. Cookies, analytics &amp; advertising</h2>
          <p className="text-neutral-400">
            We use essential cookies so you can stay signed in and use the site securely.
            We may also use analytics and advertising cookies. Third-party vendors, including Google,
            use cookies to serve ads based on your prior visits to this and other websites.
            Google&apos;s use of advertising cookies enables it and its partners to serve ads based on your visit.
          </p>
          <p className="mt-2 text-neutral-400">
            You can opt out of personalized advertising by visiting{" "}
            <a className="text-sky-400 hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>{" "}
            or{" "}
            <a className="text-sky-400 hover:underline" href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
              aboutads.info/choices
            </a>
            . You can also control cookies in your browser settings. Blocking some cookies may limit features.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">4. Sharing of data</h2>
          <p className="text-neutral-400">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-400">
            <li>Infrastructure providers (hosting, database, auth) needed to run NepARENA.</li>
            <li>Advertising and analytics partners (e.g. Google) under their own policies.</li>
            <li>Organizers of tournaments you join, for the limited purpose of running that event.</li>
            <li>Authorities when required by law or to protect safety and platform integrity.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">5. Data retention &amp; security</h2>
          <p className="text-neutral-400">
            We keep account and activity data while your account is active and as needed for legitimate
            platform, legal, and security purposes. We use industry-standard safeguards; no method of
            transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">6. Your rights</h2>
          <p className="text-neutral-400">
            Depending on your location, you may request access, correction, deletion, or export of your
            personal data, or object to certain processing. Contact us using the email below.
            You may also delete your account from settings where available.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">7. Children</h2>
          <p className="text-neutral-400">
            NepARENA is not directed at children under 13 (or the minimum age required in your country).
            We do not knowingly collect personal information from children. If you believe a child has
            provided data, contact us and we will take appropriate steps.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">8. Changes</h2>
          <p className="text-neutral-400">
            We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change.
            Continued use of NepARENA after changes means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">9. Contact</h2>
          <p className="text-neutral-400">
            Privacy questions:{" "}
            <a className="text-sky-400 hover:underline" href="mailto:aashish46ak@gmail.com">
              aashish46ak@gmail.com
            </a>
            . Also see{" "}
            <Link to="/ownership" className="text-sky-400 hover:underline">
              Ownership
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="text-sky-400 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}
