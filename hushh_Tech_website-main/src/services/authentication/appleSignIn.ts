import resources from "../../resources/resources";
import { startUnifiedOAuth } from "../../auth/session";

// Initiates Supabase OAuth flow for Apple sign-in.
export default async function appleSignIn() {
  return startUnifiedOAuth("apple", resources.config.supabaseClient);
}
