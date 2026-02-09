import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Social Media Manager",
  description: "Privacy Policy for Social Media Manager - how we handle data for YouTube, Instagram, Facebook, and Google My Business.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card className="border-border/50">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl md:text-3xl">Privacy Policy</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
              <p>
                This Privacy Policy describes how Social Media Manager (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) collects, uses, and shares 
                information when you use our platform to connect and manage accounts on <strong>YouTube</strong>, <strong>Instagram</strong>, 
                <strong> Facebook</strong>, and <strong>Google My Business (GMB)</strong>. We are committed to protecting your privacy and handling data responsibly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
              <p>We collect information you provide and data we receive from connected platforms:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Account information:</strong> email, name, and profile details (e.g. from Google or email sign-in).</li>
                <li><strong>Connected platform data:</strong> When you connect YouTube, Instagram, Facebook, or GMB, we receive and store access tokens and related profile/page data (e.g. channel name, page name, business locations) necessary to schedule and publish content and show your accounts in the dashboard.</li>
                <li><strong>Content you create:</strong> Posts, captions, media, and scheduling preferences you submit through the Service.</li>
                <li><strong>Usage data:</strong> Logs and analytics about how you use the Service (e.g. features used, errors) to operate and improve the product.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Provide, maintain, and improve the Service (including YouTube, Instagram, Facebook, and GMB integrations).</li>
                <li>Authenticate you and sync your accounts and content across the Service.</li>
                <li>Schedule and publish content to the platforms you connect, in accordance with your choices.</li>
                <li>Send you service-related communications (e.g. security or product updates).</li>
                <li>Comply with legal obligations and enforce our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Third-Party Platforms (YouTube, Instagram, Facebook, GMB)</h2>
              <p>
                When you connect an account, we use official APIs provided by Google (YouTube, GMB) and Meta (Instagram, Facebook). 
                Those providers have their own privacy policies that govern how they collect and use data. We only use the access and data 
                they make available to us to provide the features you request (e.g. listing channels/pages, posting, scheduling). 
                We do not sell your personal information to these or any other third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Data Retention and Security</h2>
              <p>
                We retain your account data and connected platform tokens for as long as your account is active or as needed to provide the Service. 
                You can disconnect platforms at any time from the Service; we will cease using those tokens and associated data for new operations. 
                We implement appropriate technical and organisational measures to protect your data against unauthorised access, loss, or misuse.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
              <p>
                Depending on your location, you may have rights to access, correct, delete, or port your personal data, or to object to or restrict 
                certain processing. You can update account details and disconnect linked accounts (YouTube, Instagram, Facebook, GMB) from within the Service. 
                For other requests or questions about this policy, contact us using the support or contact options provided.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Children</h2>
              <p>
                The Service is not intended for users under the age of 13 (or higher where required by law). We do not knowingly collect personal 
                information from children. If you believe we have collected such information, please contact us so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will post the updated policy on this page and indicate the last updated date. 
                Continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us through the support or contact options provided in the Service or on our website.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/terms">
            <Button variant="outline">Terms of Service</Button>
          </Link>
          <Link href="/">
            <Button variant="default">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
