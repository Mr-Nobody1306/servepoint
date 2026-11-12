/* ServePoint public settings — safe to ship. These three keys are PUBLIC BY
   DESIGN (Supabase anon + Paystack public key are enforced server-side by
   RLS / dashboard settings). The Groq key is NOT here — it lives in the
   server's .env and the browser never sees it. Fill in the placeholders. */
window.FIXHUB_CONFIG = {
  supabaseUrl: "PASTE_YOUR_SUPABASE_URL_HERE",
  supabaseAnonKey: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE",
  paystackPublicKey: "PASTE_YOUR_PAYSTACK_PUBLIC_KEY_HERE"
};
