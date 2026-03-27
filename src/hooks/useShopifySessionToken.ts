import { useCallback } from "react";

// Extend window type for App Bridge v4 (CDN version)
declare global {
  interface Window {
    shopify?: {
      config?: { apiKey?: string };
      idToken?: () => Promise<string>;
    };
  }
}

export function useShopifySessionToken() {
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    try {
      if (
        typeof window !== "undefined" &&
        window.shopify &&
        typeof window.shopify.idToken === "function"
      ) {
        const token = await window.shopify.idToken();
        return token ?? null;
      }
    } catch (err) {
      // Not embedded, or App Bridge not yet initialised — safe to ignore
      console.warn("[SyncroNice] Shopify session token unavailable:", err);
    }
    return null;
  }, []);

  // isEmbedded derived directly from DOM — no async state needed
  const isEmbedded =
    typeof window !== "undefined" &&
    (
      // Running in an iframe
      window.self !== window.top ||
      // App Bridge has populated window.shopify
      !!window.shopify?.config?.apiKey
    );

  return { isEmbedded, getSessionToken };
}
