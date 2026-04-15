import { createSign } from "crypto";
import {
  buildWalletCardContentFromPayload,
  getWalletPayloadFieldValue,
  WALLET_CARD_ORGANIZATION_NAME,
} from "./shared/walletPassModel.js";

const GOOGLE_WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const GOOGLE_WALLET_UNAVAILABLE_MESSAGE = "Google Wallet is temporarily unavailable while we finish the wallet issuer setup.";

// --- CONFIGURATION REFACTORED FOR CLOUD-RUN ---
const getLocalGoogleWalletConfig = () => {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim();

  // Handles both literal newlines and escaped \n from env vars
  let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    if (!privateKey.includes("---BEGIN PRIVATE KEY---")) {
      console.warn("Wallet: Private key format looks suspicious. Check your env vars.");
    }
  }

  const classSuffix = process.env.GOOGLE_WALLET_CLASS_SUFFIX?.trim() || "hushh_gold_investor_v1";

  // If we don't have an issuerId, we can't do local generation
  if (!issuerId) return null;

  return {
    issuerId,
    clientEmail,
    privateKey,
    classSuffix,
    origins: (process.env.GOOGLE_WALLET_ALLOWED_ORIGINS || "https://hushhtech.com")
      .split(",").map(v => v.trim()).filter(Boolean),
  };
};

// --- AUTHENTICATION REFACTORED (BUG #3 FIX) ---
const getGoogleWalletClient = async (config) => {
  const { google } = await import("googleapis");

  let auth;
  // If we have a manual key (Local Dev), use JWT
  if (config.clientEmail && config.privateKey) {
    auth = new google.auth.JWT(
      config.clientEmail,
      null,
      config.privateKey,
      [GOOGLE_WALLET_SCOPE]
    );
  } else {
    // If no key is provided (Production/Cloud Run), use the Server's Service Account
    // This is the "Cloud-Native" way that fixes Bug #3!
    const googleAuth = new google.auth.GoogleAuth({
      scopes: [GOOGLE_WALLET_SCOPE],
    });
    auth = await googleAuth.getClient();
  }

  return google.walletobjects({ version: "v1", auth });
};

// ... keep buildSignedJwt, buildGenericClass, buildGenericObject as they were ...

const createLocalGoogleWalletPass = async (payload, config) => {
  const walletobjects = await getGoogleWalletClient(config);

  const classId = `${config.issuerId}.${normalizeGoogleWalletId(config.classSuffix)}`;
  const objectSuffix = normalizeGoogleWalletId(
    getWalletPayloadFieldValue(payload.auxiliaryFields, "memberId", payload.barcode?.message)
  );
  const objectId = `${config.issuerId}.${objectSuffix}`;

  await ensureGenericClass(walletobjects, classId);
  const genericObject = await ensureGenericObject(walletobjects, objectId, classId, payload);

  // Note: createSignedJwt still needs a private key. 
  // In a pure Cloud-Run setup, you'd use the IAM SignBlob API, 
  // but keeping this for your current workflow.
  const token = createSignedJwt(
    {
      iss: config.clientEmail || "service-account@google.com",
      aud: "google",
      origins: config.origins,
      typ: "savetowallet",
      payload: { genericObjects: [genericObject] },
    },
    config.privateKey
  );

  return {
    saveUrl: `https://pay.google.com/gp/v/save/${token}`,
    provider: "local",
  };
};

// ... keep the rest of the file (handler, etc.) ...