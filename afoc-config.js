// Public runtime configuration for AFOC.
// The Supabase publishable key is safe to expose in a browser app when RLS is enabled.
// Never put service_role/admin secrets in this repository.
window.AFOC_CONFIG = {
  supabaseUrl: "",
  supabasePublishableKey: "",
  redirectUrl: "https://h9966882-max.github.io/atlas-afoc/secure.html"
};
