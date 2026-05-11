import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import syncroniceLogo from "@/assets/syncronice-logo.jpg";

const ShopifyCallback = () => {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop") || "";
  const storeName = searchParams.get("storeName") || "";
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!shop) return;

    if (window.opener) {
      // Send success message to the parent window
      window.opener.postMessage(
        { type: "shopify-oauth-success", shop, storeName },
        "*"
      );
      setClosing(true);
      setTimeout(() => window.close(), 2000);
    } else {
      // Opened directly (not as a popup), redirect to home
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    }
  }, [shop, storeName]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="bg-card border border-border rounded-xl shadow-lg p-12 max-w-sm w-full text-center">
        <img
          src={syncroniceLogo}
          alt="SyncroNice"
          className="w-10 h-10 rounded-lg mx-auto mb-6"
        />

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Store Connected!
        </h2>

        {storeName && (
          <span className="inline-block bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1 rounded-md mb-4">
            {storeName}
          </span>
        )}

        <p className="text-sm text-muted-foreground mb-6">
          Your Shopify store has been successfully linked to SyncroNice. You can
          now import and manage your products.
        </p>

        <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {closing ? "Closing this window…" : "Redirecting back to the app…"}
        </p>
      </div>
    </div>
  );
};

export default ShopifyCallback;
