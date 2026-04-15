import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Coins Deduction Notification — Sends email when coins are used for meeting booking
 * Uses Gmail API with Service Account (Domain-Wide Delegation)
 * Same pattern as nda-signed-notification
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      `From: Hushh Coins <${senderEmail}>`,
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

const buildDeductionEmailHtml = (name: string, coins: number, meetingDate: string, meetingTime: string, date: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:0;">
        <tr><td style="background-color:#000000;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">HUSHH</h1>
          <p style="margin:6px 0 0;color:#999999;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Meeting Booking Confirmation</p>
        </td></tr>
        <tr><td style="padding:40px 40px 24px;text-align:center;">
          <p style="margin:0;font-size:48px;line-height:1;">✅</p>
          <h2 style="margin:12px 0 8px;color:#000000;font-size:24px;font-weight:800;">Meeting Confirmed!</h2>
          <p style="margin:0;color:#666666;font-size:14px;">Your consultation has been successfully scheduled</p>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;" colspan="2">Meeting Details</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;width:40%;">With</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">Manish Sainani, Hedge Fund Manager</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${meetingDate}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Time</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${meetingTime}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Duration</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">1 Hour</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;" colspan="2">Coins Transaction</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;width:40%;">Coins Used</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${coins.toLocaleString()} HC</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Value</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">$${(coins / 100).toLocaleString()}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Purpose</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">CEO Consultation Booking</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Transaction Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${date}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Prepare For Your Session</td>
            </tr>
            <tr><td style="padding:16px;">
              <p style="margin:0 0 10px;font-size:13px;color:#333333;">📋 <strong>Review your portfolio</strong> — Have your current investment holdings and goals ready to discuss.</p>
              <p style="margin:0 0 10px;font-size:13px;color:#333333;">❓ <strong>Prepare questions</strong> — Write down specific questions about strategies, allocation, or market outlook.</p>
              <p style="margin:0;font-size:13px;color:#333333;">📧 <strong>Check your calendar invite</strong> — A separate calendar invite with the meeting link will be sent shortly.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#999999;">This email was sent by Hushh Technologies Pte Ltd.</p>
          <p style="margin:0;font-size:11px;color:#999999;">© ${new Date().getFullYear()} Hushh. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Main Handler ───

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recipientEmail, recipientName, coinsDeducted, meetingDate, meetingTime } = await req.json();
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = recipientName || "Hushh User";
    const coins = Number(coinsDeducted) || 300000;
    const mDate = meetingDate || "TBD";
    const mTime = meetingTime || "TBD";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const html = buildDeductionEmailHtml(name, coins, mDate, mTime, date);
    const subject = `✅ Meeting Confirmed — ${coins.toLocaleString()} Hushh Coins Used`;

    const result = await sendGmailEmail([recipientEmail], subject, html);

    if (!result.success) {
      console.error("❌ Deduction email error:", result.error);
      return new Response(JSON.stringify({ error: result.error || "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Deduction email sent to ${recipientEmail}: ${coins} coins, messageId: ${result.messageId}`);
    return new Response(JSON.stringify({ success: true, message: "Deduction email sent", messageId: result.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Deduction email error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send email" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
