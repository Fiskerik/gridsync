import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import syncroniceLogo from "@/assets/syncronice-logo.jpg";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to app
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <img src={syncroniceLogo} alt="SyncroNice" className="w-10 h-10 rounded-lg" />
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <p><strong className="text-foreground">Last updated:</strong> March 25, 2026</p>

        <p>SyncroNice ("we", "our", "us") operates the SyncroNice platform. This Privacy Policy describes how we collect, use, and share your personal information when you use our service.</p>

        <h2 className="text-foreground text-lg font-semibold">Information We Collect</h2>
        <p>We collect information you provide directly, including your email address, display name, and Shopify store credentials. We also collect product data from your connected Shopify stores to enable bulk editing functionality.</p>

        <h2 className="text-foreground text-lg font-semibold">How We Use Your Information</h2>
        <p>We use your information to provide and improve our services, authenticate your identity, sync product data with Shopify, process scheduled edits, and communicate with you about your account.</p>

        <h2 className="text-foreground text-lg font-semibold">Data Storage</h2>
        <p>Your data is stored securely using Supabase infrastructure with Row Level Security (RLS) policies ensuring you can only access your own data. Shopify access tokens are encrypted at rest.</p>

        <h2 className="text-foreground text-lg font-semibold">Third-Party Services</h2>
        <p>We integrate with Shopify's API to read and write product data on your behalf. We do not sell or share your data with any other third parties.</p>

        <h2 className="text-foreground text-lg font-semibold">Data Retention</h2>
        <p>We retain your data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting support.</p>

        <h2 className="text-foreground text-lg font-semibold">Contact</h2>
        <p>For privacy-related inquiries, please contact us at <a href="mailto:support@syncronice.app" className="text-primary hover:underline">support@syncronice.app</a>.</p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
