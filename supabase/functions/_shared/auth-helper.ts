
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function resolveSupabaseUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAuthHeader = req.headers.get("X-Supabase-Auth") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anonClient = createClient(supabaseUrl, anonKey);

  // If X-Supabase-Auth is present, the main Authorization header is a Shopify
  // session token — use X-Supabase-Auth for Supabase user resolution instead.
  const tokenToVerify = supabaseAuthHeader
    ? supabaseAuthHeader
    : authHeader.replace("Bearer ", "");

  if (!tokenToVerify) {
    return { user: null, error: "Missing authorization" };
  }

  const { data: { user }, error } = await anonClient.auth.getUser(tokenToVerify);
  return { user, error };
}
