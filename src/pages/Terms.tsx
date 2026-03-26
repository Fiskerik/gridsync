import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import syncroniceLogo from "@/assets/syncronice-logo.jpg";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to app
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <img src={syncroniceLogo} alt="SyncroNice" className="w-10 h-10 rounded-lg" />
        <h1 className="text-2xl font-bold text-foreground">Terms & Conditions</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <p><strong className="text-foreground">Last updated:</strong> March 25, 2026</p>

        <p>By accessing or using SyncroNice, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the service.</p>

        <h2 className="text-foreground text-lg font-semibold">Service Description</h2>
        <p>SyncroNice is a bulk product editing tool for Shopify merchants. It allows you to view, edit, and push product changes to your connected Shopify store(s).</p>

        <h2 className="text-foreground text-lg font-semibold">Account Responsibility</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate Shopify store information.</p>

        <h2 className="text-foreground text-lg font-semibold">Acceptable Use</h2>
        <p>You agree not to use the service to violate any laws, infringe on intellectual property, or perform actions that could harm the platform or other users.</p>

        <h2 className="text-foreground text-lg font-semibold">Limitation of Liability</h2>
        <p>SyncroNice is provided "as is" without warranties. We are not liable for any damages arising from your use of the service, including but not limited to data loss, incorrect product updates, or Shopify API errors. You are responsible for reviewing changes before applying them.</p>

        <h2 className="text-foreground text-lg font-semibold">Modifications</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>

        <h2 className="text-foreground text-lg font-semibold">Termination</h2>
        <p>We may suspend or terminate your access to the service at our discretion if you violate these terms.</p>

        <h2 className="text-foreground text-lg font-semibold">Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:support@syncronice.app" className="text-primary hover:underline">support@syncronice.app</a>.</p>
      </div>
    </div>
  </div>
);

export default Terms;
