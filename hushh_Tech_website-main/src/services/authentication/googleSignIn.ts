import resources from "../../resources/resources";
import { startUnifiedOAuth } from "../../auth/session";

// Use Supabase OAuth flow for Google sign-in.
export default async function googleSignIn() {
  return startUnifiedOAuth("google", resources.config.supabaseClient);
}
