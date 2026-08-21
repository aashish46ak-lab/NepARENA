import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildSeoHead({
      title: "Terms of Service",
      description: "Terms governing use of NepARENA — accounts, tournaments, content, and acceptable use.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <ContentPageShell title="Terms of Service" subtitle="Last updated: August 21, 2026" icon={FileText}>
      <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of{" "}
          <strong className="text-white">NepARENA</strong> at https://neparena.xyz.
          By creating an account or using the platform, you agree to these Terms.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">1. The service</h2>
          <p className="text-neutral-400">
            NepARENA is a multi-organizer esports platform for tournaments, community pages, messaging,
            and related tools. Features may change, and some areas may be limited or experimental.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">2. Accounts</h2>
          <ul className="list-disc space-y-1 pl-5 text-neutral-400">
            <li>You must provide accurate registration information and keep credentials secure.</li>
            <li>You are responsible for activity under your account.</li>
            <li>We may suspend or terminate accounts that violate these Terms or harm other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">3. Organizers &amp; tournaments</h2>
          <p className="text-neutral-400">
            Tournament organizers are responsible for their event rules, schedules, and decisions within
            the tools we provide. NepARENA is not a party to disputes between players and organizers
            except where we choose to moderate for safety or policy violations. Entry fees (if any)
            are handled by organizers under their own terms unless stated otherwise.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">4. User content</h2>
          <p className="text-neutral-400">
            You retain rights to content you post. You grant NepARENA a non-exclusive license to host,
            display, and distribute that content as needed to operate the service. You must not post
            illegal, abusive, infringing, or deceptive content. We may remove content that violates
            these Terms or our community rules.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">5. Acceptable use</h2>
          <ul className="list-disc space-y-1 pl-5 text-neutral-400">
            <li>No cheating, match-fixing, harassment, hate speech, or impersonation.</li>
            <li>No scraping, attacking, or attempting to disrupt the service.</li>
            <li>No spam, malware, or unauthorized advertising.</li>
            <li>Follow applicable laws and game publisher rules for competitive play.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">6. Advertising</h2>
          <p className="text-neutral-400">
            The site may display third-party advertisements (including Google AdSense). Ads are provided
            by partners and may use cookies as described in our{" "}
            <Link to="/privacy" className="text-sky-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">7. Disclaimers</h2>
          <p className="text-neutral-400">
            NepARENA is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted
            availability, error-free operation, or specific tournament outcomes. To the fullest extent
            permitted by law, we are not liable for indirect or consequential damages arising from use
            of the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">8. Changes</h2>
          <p className="text-neutral-400">
            We may update these Terms. Continued use after updates constitutes acceptance. If you do
            not agree, stop using NepARENA.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-white">9. Contact</h2>
          <p className="text-neutral-400">
            Questions:{" "}
            <a className="text-sky-400 hover:underline" href="mailto:aashish46ak@gmail.com">
              aashish46ak@gmail.com
            </a>
            . See also{" "}
            <Link to="/privacy" className="text-sky-400 hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/ownership" className="text-sky-400 hover:underline">
              Ownership
            </Link>
            .
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}
