import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * NWS Score Notification — Sends NDA-style email with Net Worth Intelligence Report
 * Uses Gmail API with Service Account (Domain-Wide Delegation)
 * Same pattern as nda-signed-notification
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NWSNotificationPayload {
  user_email: string;
  user_name: string;
  nws_score: number;
  nws_tier: string;
  total_cash_balance: number;
  total_investment_value: number;
  num_accounts: number;
  account_types: string[];
  primary_institution: string | null;
  address_city: string | null;
  address_state: string | null;
  identity_verification_score: number | null;
  profile_url?: string;
}

// ─── Gmail API Helpers ───

function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createSignedJWT(
  serviceAccountEmail: string, privateKey: string,
  userToImpersonate: string, scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountEmail, sub: userToImpersonate,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600, scope: scopes.join(" "),
  };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const privateKeyPem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const privateKeyBuffer = Uint8Array.from(atob(privateKeyPem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", privateKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signatureInput)
  );
  return `${signatureInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function getAccessToken(
  serviceAccountEmail: string, privateKey: string, userToImpersonate: string
): Promise<string> {
  const signedJwt = await createSignedJWT(
    serviceAccountEmail, privateKey, userToImpersonate,
    ["https://www.googleapis.com/auth/gmail.send"]
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJwt,
    }),
  });
  if (!response.ok) throw new Error(`Failed to get access token: ${await response.text()}`);
  return (await response.json()).access_token;
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  const encoded = btoa(unescape(encodeURIComponent(subject)));
  return `=?UTF-8?B?${encoded}?=`;
}

function encodeBase64WithLineBreaks(content: string): string {
  const base64 = btoa(unescape(encodeURIComponent(content)));
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) lines.push(base64.slice(i, i + 76));
  return lines.join("\r\n");
}

async function sendGmailEmail(
  recipients: string[], subject: string, htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const senderEmail = Deno.env.get("GMAIL_SENDER_EMAIL") || "ankit@hushh.ai";
    if (!serviceAccountEmail || !privateKey) {
      return { success: false, error: "Missing Google Service Account credentials" };
    }
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    const accessToken = await getAccessToken(serviceAccountEmail, formattedPrivateKey, senderEmail);
    const rawMessage = [
      `From: Hushh Intelligence <${senderEmail}>`,
      `To: ${recipients.join(", ")}`,
      `Subject: ${encodeSubject(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodeBase64WithLineBreaks(htmlContent),
    ].join("\r\n");
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: base64urlEncode(rawMessage) }),
      }
    );
    if (!response.ok) return { success: false, error: `Gmail API error: ${await response.text()}` };
    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Email Template ───

function buildEmailHtml(data: NWSNotificationPayload): string {
  const tierColor = data.nws_tier === "Elite" ? "#00C853"
    : data.nws_tier === "Strong" ? "#2979FF"
    : data.nws_tier === "Moderate" ? "#FF9100"
    : "#FF5252";

  const location = [data.address_city, data.address_state].filter(Boolean).join(", ") || "—";
  const accountTypesStr = data.account_types.length > 0 ? data.account_types.join(", ") : "—";
  const profileUrl = data.profile_url || "https://hushh.ai/hushh-user-profile";
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="background-color:#000000;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">HUSHH</h1>
          <p style="margin:6px 0 0;font-size:11px;color:#999999;letter-spacing:2px;text-transform:uppercase;">Net Worth Intelligence Report</p>
        </td></tr>

        <tr><td style="background-color:#111111;padding:32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#666666;letter-spacing:1px;text-transform:uppercase;">Your NWS Score</p>
          <p style="margin:0;font-size:56px;font-weight:800;color:#ffffff;line-height:1;">${data.nws_score}</p>
          <p style="margin:8px 0 0;font-size:11px;font-weight:600;color:${tierColor};letter-spacing:1.5px;text-transform:uppercase;">● ${data.nws_tier} Tier</p>
          <p style="margin:16px 0 0;font-size:11px;color:#555555;">out of 100 · calculated ${now}</p>
        </td></tr>

        <tr><td style="background-color:#ffffff;padding:32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#000000;line-height:1.6;">Dear <strong>${data.user_name}</strong>,</p>
          <p style="margin:0 0 24px;font-size:13px;color:#333333;line-height:1.7;">
            Your Net Worth Score has been calculated using verified financial data from your linked bank accounts. This score reflects your overall financial health and investment readiness.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;margin-bottom:24px;">
            <tr><td colspan="2" style="background-color:#000000;padding:10px 16px;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">Financial Summary</p>
            </td></tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;width:50%;">Cash Reserves</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">$${data.total_cash_balance.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Investment Holdings</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">$${data.total_investment_value.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Total Accounts</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${data.num_accounts}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Account Types</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${accountTypesStr}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Primary Institution</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${data.primary_institution || "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Verified Location</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${location}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;">Identity Verification</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;text-align:right;">${data.identity_verification_score !== null ? data.identity_verification_score + "%" : "—"}</td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${profileUrl}" target="_blank" style="display:inline-block;background-color:#000000;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:14px 32px;letter-spacing:0.5px;">VIEW YOUR FULL PROFILE</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;">
            This score is generated using verified financial data from your linked bank accounts via Plaid. Your data is encrypted and never shared without your explicit consent. Hushh does not store your bank credentials.
          </p>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-top:1px solid #e5e5e5;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999999;">© ${new Date().getFullYear()} Hushh Technologies LLC. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:10px;color:#cccccc;">Your data, your rules. Privacy-first intelligence.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main Handler ───

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const payload: NWSNotificationPayload = await req.json();

    if (!payload.user_email || !payload.user_name) {
      return new Response(JSON.stringify({ error: "Missing user_email or user_name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailHtml = buildEmailHtml(payload);
    const subject = `Your Net Worth Score: ${payload.nws_score}/100 — ${payload.nws_tier} Tier`;

    const result = await sendGmailEmail([payload.user_email], subject, emailHtml);

    if (!result.success) {
      console.error("❌ NWS email error:", result.error);
      return new Response(JSON.stringify({ error: "Failed to send email", details: result.error }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`✅ NWS email sent to ${payload.user_email}, score: ${payload.nws_score}, messageId: ${result.messageId}`);

    return new Response(JSON.stringify({ success: true, email_id: result.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("NWS notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
