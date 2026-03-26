import { useCallback, useEffect, useState } from "react";

// Extend window type for App Bridge v4 (CDN version)
declare global {
  interface Window {
    shopify?: {
      config?: { apiKey?: string };
      idToken?: () => Promise<string>;
    };
  }
}

/**
 * Hook that detects whether the app is running embedded inside Shopify Admin
 * and provides a function to get a fresh Shopify session token via App Bridge.
 *
 * App Bridge v4 (loaded from Shopify CDN) exposes window.shopify.idToken()
 * which returns a signed JWT (session token) for the current merchant session.
 *
 * When running standalone (not embedded), getSessionToken() returns null safely.
 */
export function useShopifySessionToken() {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // The app is embedded when it's running inside an iframe (window.self !== window.top)
    // or when App Bridge has set window.shopify with a config
    const checkEmbedded = () => {
      try {
        const inIframe = window.self !== window.top;
        const hasAppBridge = !!window.shopify?.config?.apiKey;
        setIsEmbedded(inIframe || hasAppBridge);
      } catch {
        // Cross-origin iframe access throws — that itself means we're embedded
        setIsEmbedded(true);
      }
    };

    checkEmbedded();

    // Re-check after a short delay to allow App Bridge to initialise
    const timer = setTimeout(checkEmbedded, 500);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Returns a fresh Shopify session token (JWT) for the current merchant session.
   * Returns null when not running embedded or if App Bridge is unavailable.
   *
   * The token is valid for ~1 minute — always call this fresh per request.
   */
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    if (!isEmbedded) return null;

    try {
      // App Bridge v4 CDN exposes window.shopify.idToken()
      if (window.shopify && typeof window.shopify.idToken === "function") {
        const token = await window.shopify.idToken();
        return token;
      }
    } catch (err) {
      console.warn("[SyncroNice] Failed to get Shopify session token:", err);
    }

    return null;
  }, [isEmbedded]);

  return { isEmbedded, getSessionToken };
}
