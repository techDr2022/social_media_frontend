import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Social Media Manager",
  description: "Terms of Service for Social Media Manager - YouTube, Instagram, Facebook, and Google My Business integrations.",
};

export default function TermsPage() {
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
              <FileText className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl md:text-3xl">Terms of Service</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Social Media Manager (&quot;the Service&quot;), you agree to be bound by these Terms of Service. 
                The Service allows you to connect, schedule, and publish content to YouTube, Instagram, Facebook, and Google My Business (GMB) 
                through their respective APIs. Use of each connected platform is also subject to that platform&apos;s own terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
              <p>
                The Service provides a dashboard to manage social media accounts including: scheduling and publishing posts to 
                <strong> YouTube</strong>, <strong>Instagram</strong>, <strong>Facebook</strong>, and <strong>Google My Business</strong>. 
                We act as an intermediary between you and these platforms. We do not control YouTube (Google), Instagram (Meta), 
                Facebook (Meta), or Google My Business, and their availability, features, and policies may change at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. Third-Party Platform Terms</h2>
              <p>
                By connecting your accounts, you agree to comply with each platform&apos;s terms and policies:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>YouTube</strong>: Google&apos;s Terms of Service and YouTube Terms of Service apply to content and data accessed via our Service.</li>
                <li><strong>Instagram &amp; Facebook</strong>: Meta&apos;s Terms of Service, Data Policy, and Platform Terms apply to your use of Instagram and Facebook features.</li>
                <li><strong>Google My Business (GMB)</strong>: Google&apos;s Terms of Service and Google My Business terms apply to business profile and posting features.</li>
              </ul>
              <p className="mt-2">
                We are not responsible for changes to third-party APIs, rate limits, or discontinuation of features by YouTube, Instagram, Facebook, or Google.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
              <p>
                You agree not to use the Service to post illegal, harmful, misleading, or policy-violating content on any connected platform. 
                You are responsible for ensuring your content complies with each platform&apos;s community guidelines and advertising policies. 
                We may suspend or terminate access if we reasonably believe you have violated these terms or any applicable platform policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Account and Data</h2>
              <p>
                You must provide accurate information and keep your account secure. You are responsible for all activity under your account. 
                How we collect, use, and share data is described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Disclaimer of Warranties</h2>
              <p>
                The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access to YouTube, Instagram, 
                Facebook, or GMB integrations, or that the Service will meet your specific requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising 
                from your use of the Service or from actions of third-party platforms (YouTube, Instagram, Facebook, Google).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Changes</h2>
              <p>
                We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance. 
                We will indicate the last updated date at the top of this page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
              <p>
                For questions about these Terms, contact us through the support or contact options provided in the Service or on our website.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/privacy">
            <Button variant="outline">Privacy Policy</Button>
          </Link>
          <Link href="/">
            <Button variant="default">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
