import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import syncroniceLogo from "@/assets/syncronice-logo.jpg";

const ShopifyCallback = () => {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop") || "";
  const storeName = searchParams.get("storeName") || "";
  const [autoClosed, setAutoClosed] = useState(false);

  useEffect(() => {
    if (!shop) return;

    // Notify the opener (if any) that OAuth succeeded
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "shopify-oauth-success", shop, storeName },
          "*"
        );
      }
    } catch {
      // ignore cross-origin issues
    }

    // Try to auto-close the popup. Browsers may block window.close() for
    // top-level windows the user did not explicitly open via script — in that
    // case we just leave the success message visible and let the user close it.
    const timer = setTimeout(() => {
      try {
        window.close();
        setAutoClosed(true);
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearTimeout(timer);
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
          Your Shopify store has been successfully linked to SyncroNice.
        </p>

        <p className="text-xs text-muted-foreground">
          {autoClosed ? "Closing…" : "You can now close this window."}
        </p>
      </div>
    </div>
  );
};

export default ShopifyCallback;
