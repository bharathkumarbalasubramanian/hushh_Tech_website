// NDA Signed Notification Service
// Sends email notification to manish@hushh.ai and ankit@hushh.ai when user signs NDA
// Uses Gmail API with Service Account (Domain-Wide Delegation)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Recipients for NDA notifications
const NDA_NOTIFICATION_RECIPIENTS = [
  'manish@hushh.ai',
  'ankit@hushh.ai',
  'neelesh1@hushh.ai'
];

interface NDANotificationPayload {
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ndaVersion: string;
  signerIp?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  userId?: string;
  documentsAcknowledged?: string[];
}

// Base64URL encoding utilities
function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Create a signed JWT for Google Service Account authentication
 */
async function createSignedJWT(
  serviceAccountEmail: string,
  privateKey: string,
  userToImpersonate: string,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountEmail,
    sub: userToImpersonate,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
    scope: scopes.join(" "),
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
    "pkcs8",
    privateKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get an access token using the Service Account JWT
 */
async function getAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
  userToImpersonate: string
): Promise<string> {
  const scopes = ["https://www.googleapis.com/auth/gmail.send"];

  const signedJwt = await createSignedJWT(
    serviceAccountEmail,
    privateKey,
    userToImpersonate,
    scopes
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Encode content to base64 with line breaks
 */
function encodeBase64WithLineBreaks(content: string): string {
  const base64 = btoa(unescape(encodeURIComponent(content)));
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    lines.push(base64.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

/**
 * Create RFC 2822 formatted email with optional PDF attachment
 */
function createEmailMessage(
  from: string,
  recipients: string[],
  subject: string,
  htmlContent: string,
  pdfBase64?: string,
  pdfFileName?: string
): string {
  const boundary = `boundary_${Date.now()}`;
  const encodedHtml = encodeBase64WithLineBreaks(htmlContent);
  
  const emailLines = [
    `From: Hushh NDA Notifications <${from}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (pdfBase64 && pdfFileName) {
    // Email with attachment
    emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    emailLines.push(``);
    emailLines.push(`--${boundary}`);
    emailLines.push(`Content-Type: text/html; charset="UTF-8"`);
    emailLines.push(`Content-Transfer-Encoding: base64`);
    emailLines.push(``);
    emailLines.push(encodedHtml);
    emailLines.push(``);
    emailLines.push(`--${boundary}`);
    emailLines.push(`Content-Type: application/pdf; name="${pdfFileName}"`);
    emailLines.push(`Content-Disposition: attachment; filename="${pdfFileName}"`);
    emailLines.push(`Content-Transfer-Encoding: base64`);
    emailLines.push(``);
    emailLines.push(pdfBase64);
    emailLines.push(``);
    emailLines.push(`--${boundary}--`);
  } else {
    // Email without attachment
    emailLines.push(`Content-Type: text/html; charset="UTF-8"`);
    emailLines.push(`Content-Transfer-Encoding: base64`);
    emailLines.push(``);
    emailLines.push(encodedHtml);
  }

  return emailLines.join("\r\n");
}

/**
 * Send email using Gmail API
 */
async function sendGmailEmail(
  recipients: string[],
  subject: string,
  htmlContent: string,
  pdfBase64?: string,
  pdfFileName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const senderEmail = Deno.env.get("GMAIL_SENDER_EMAIL") || "ankit@hushh.ai";

    if (!serviceAccountEmail || !privateKey) {
      return { success: false, error: "Missing Google Service Account credentials" };
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

    console.log(`Sending NDA notification email from ${senderEmail} to ${recipients.join(", ")}`);

    const accessToken = await getAccessToken(
      serviceAccountEmail,
      formattedPrivateKey,
      senderEmail
    );

    const rawMessage = createEmailMessage(
      senderEmail,
      recipients,
      subject,
      htmlContent,
      pdfBase64,
      pdfFileName
    );

    const encodedMessage = base64urlEncode(rawMessage);

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gmail API error:", error);
      return { success: false, error: `Gmail API error: ${error}` };
    }

    const result = await response.json();
    console.log(`NDA notification sent successfully, message ID: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: NDANotificationPayload = await req.json();
    
    const { 
      signerName, 
      signerEmail, 
      signedAt, 
      ndaVersion, 
      signerIp = 'Unknown',
      pdfUrl,
      pdfBase64,
      userId,
      documentsAcknowledged = []
    } = payload;

    if (!signerName || !signerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: signerName, signerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the signed date
    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const subject = `[Hushh NDA] Agreement Signed by ${signerName}`;
    
    // Create professional HTML email - clean black/white design with proper spacing
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NDA Agreement Signed</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
        
        <!-- Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              
              <!-- Main Content Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; border: 1px solid #000000;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 40px 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">
                      NDA Agreement Signed
                    </h1>
                    <p style="color: #999999; margin: 12px 0 0 0; font-size: 13px; font-weight: 400;">
                      Hushh Technologies Inc.
                    </p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    
                    <!-- Intro Text -->
                    <p style="color: #000000; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                      A new user has signed the Non-Disclosure Agreement on the Hushh platform.
                    </p>

                    <!-- Signer Details -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #000000; margin-bottom: 32px;">
                      
                      <!-- Table Header -->
                      <tr>
                        <td colspan="2" style="background-color: #000000; padding: 16px 20px;">
                          <span style="color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Signer Information
                          </span>
                        </td>
                      </tr>
                      
                      <!-- Name -->
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">Name</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">
                          <span style="color: #000000; font-size: 14px; font-weight: 600;">${signerName}</span>
                        </td>
                      </tr>
                      
                      <!-- Email -->
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">Email</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">
                          <a href="mailto:${signerEmail}" style="color: #000000; font-size: 14px; text-decoration: underline;">${signerEmail}</a>
                        </td>
                      </tr>
                      
                      <!-- Signed At -->
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">Signed At</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">
                          <span style="color: #000000; font-size: 14px;">${signedDate}</span>
                        </td>
                      </tr>
                      
                      <!-- NDA Version -->
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">NDA Version</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; vertical-align: top;">
                          <span style="color: #000000; font-size: 14px;">${ndaVersion}</span>
                        </td>
                      </tr>
                      
                      <!-- IP Address -->
                      <tr>
                        <td style="padding: 16px 20px; ${userId ? 'border-bottom: 1px solid #e5e5e5;' : ''} width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">IP Address</span>
                        </td>
                        <td style="padding: 16px 20px; ${userId ? 'border-bottom: 1px solid #e5e5e5;' : ''} vertical-align: top;">
                          <span style="color: #000000; font-size: 14px; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${signerIp}</span>
                        </td>
                      </tr>
                      
                      ${userId ? `
                      <!-- User ID -->
                      <tr>
                        <td style="padding: 16px 20px; width: 140px; vertical-align: top;">
                          <span style="color: #666666; font-size: 13px;">User ID</span>
                        </td>
                        <td style="padding: 16px 20px; vertical-align: top;">
                          <span style="color: #000000; font-size: 12px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; word-break: break-all;">${userId}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                    ${pdfUrl ? `
                    <!-- PDF Link -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #000000; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding-right: 16px; vertical-align: top;">
                                <span style="font-size: 24px;">📄</span>
                              </td>
                              <td style="vertical-align: top;">
                                <p style="margin: 0 0 4px 0; color: #000000; font-size: 14px; font-weight: 600;">Signed NDA Document</p>
                                <a href="${pdfUrl}" style="color: #000000; font-size: 13px; text-decoration: underline;">
                                  View/Download PDF →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${pdfBase64 ? `
                    <!-- Attachment Notice -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #000000; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #000000; font-size: 14px;">📎 The signed NDA PDF is attached to this email.</span>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${documentsAcknowledged.length > 0 ? `
                    <!-- Fund Documents Acknowledged -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #000000; margin-bottom: 32px;">
                      <tr>
                        <td style="background-color: #000000; padding: 16px 20px;">
                          <span style="color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Fund Documents Acknowledged
                          </span>
                        </td>
                      </tr>
                      ${documentsAcknowledged.map((doc: string, i: number) => `
                      <tr>
                        <td style="padding: 14px 20px; ${i < documentsAcknowledged.length - 1 ? 'border-bottom: 1px solid #e5e5e5;' : ''}">
                          <span style="color: #1a7f37; font-size: 14px; font-weight: 600;">✅</span>
                          <span style="color: #000000; font-size: 13px; margin-left: 8px;">${doc}</span>
                        </td>
                      </tr>
                      `).join('')}
                    </table>
                    ` : ''}

                    <!-- Action Buttons -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <!-- Stacked buttons for mobile compatibility -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                              <td style="padding: 8px;">
                                <a href="https://hushhtech.com/nda-admin" 
                                   style="display: inline-block; background-color: #000000; color: #ffffff; 
                                          padding: 14px 28px; text-decoration: none; font-weight: 600; 
                                          font-size: 13px; min-width: 180px; text-align: center;">
                                  View All NDA Agreements
                                </a>
                              </td>
                            </tr>
                            ${userId ? `
                            <tr>
                              <td style="padding: 8px;">
                                <a href="https://hushhtech.com/nda-admin?highlight=${userId}" 
                                   style="display: inline-block; background-color: #ffffff; color: #000000; 
                                          padding: 12px 28px; text-decoration: none; font-weight: 600; 
                                          font-size: 13px; border: 2px solid #000000; min-width: 180px; text-align: center;">
                                  View This User's NDA
                                </a>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="border-top: 1px solid #000000; padding: 24px 32px; text-align: center;">
                    <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                      This is an automated notification from Hushh Technologies Inc.
                    </p>
                    <p style="color: #666666; font-size: 12px; margin: 8px 0 0 0;">
                      © ${new Date().getFullYear()} Hushh Technologies Inc. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
              
            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

    // Prepare PDF attachment info
    let pdfFileName: string | undefined;
    if (pdfBase64) {
      const safeFileName = signerName.replace(/[^a-zA-Z0-9]/g, '_');
      pdfFileName = `NDA_${safeFileName}_${new Date().toISOString().split('T')[0]}.pdf`;
    }

    // Send email
    const result = await sendGmailEmail(
      NDA_NOTIFICATION_RECIPIENTS,
      subject,
      html,
      pdfBase64,
      pdfFileName
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`NDA notification sent for: ${signerName} (${signerEmail})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `NDA notification sent to ${NDA_NOTIFICATION_RECIPIENTS.join(', ')}`,
        recipients: NDA_NOTIFICATION_RECIPIENTS,
        messageId: result.messageId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('NDA notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to send NDA notification' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
