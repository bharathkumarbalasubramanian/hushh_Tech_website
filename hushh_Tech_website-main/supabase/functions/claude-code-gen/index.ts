/**
 * Claude Code Generation — Supabase Edge Function
 * 
 * Uses Claude Opus 4.5 via GCP Vertex AI for code generation.
 * Project: hushone-app | Region: us-east5
 * 
 * Endpoint: POST /functions/v1/claude-code-gen
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GCP_PROJECT_ID = "hushone-app";
const GCP_REGION = "us-east5";
const MODEL_ID = "claude-opus-4-5@20251101";

/**
 * Generate a GCP access token using service account credentials.
 */
async function getAccessToken(): Promise<string> {
  const email = Deno.env.get("GCP_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = Deno.env.get("GCP_PRIVATE_KEY");

  if (!email || !privateKeyRaw) {
    throw new Error("GCP credentials not configured");
  }

  // Decode PEM key
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  // Create JWT
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();

  // Base64url encode
  const b64url = (data: Uint8Array): string => {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = b64url(encoder.encode(JSON.stringify(claim)));
  const signInput = `${headerB64}.${claimB64}`;

  // Import private key and sign
  const pemBody = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

/**
 * Call Claude Opus 4.5 via Vertex AI.
 */
async function callClaude(
  prompt: string,
  language: string,
  mode: string
): Promise<{ code: string; explanation: string; thinking?: string }> {
  const accessToken = await getAccessToken();

  // System prompt based on mode
  const systemPrompts: Record<string, string> = {
    generate: `You are Hushh Code — an expert code generation AI. Generate clean, production-ready code.
- Always include comments explaining key logic.
- Follow best practices for the requested language.
- Return ONLY the code block unless asked for explanation.
- Language: ${language}`,
    debug: `You are Hushh Code — an expert debugging AI.
- Analyze the provided code for bugs, issues, and improvements.
- Explain each issue found and provide the fixed code.
- Language: ${language}`,
    explain: `You are Hushh Code — an expert code explainer.
- Break down the code into understandable sections.
- Explain what each part does in simple terms.
- Highlight any notable patterns or potential issues.
- Language: ${language}`,
    optimize: `You are Hushh Code — an expert code optimizer.
- Analyze the code for performance improvements.
- Suggest and implement optimizations.
- Explain the performance impact of each change.
- Language: ${language}`,
  };

  const systemPrompt = systemPrompts[mode] || systemPrompts.generate;

  const endpoint = `https://${GCP_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/publishers/anthropic/models/${MODEL_ID}:rawPredict`;

  const body = {
    anthropic_version: "vertex-2023-10-16",
    max_tokens: 8192,
    thinking: {
      type: "enabled",
      budget_tokens: 6000,
    },
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Vertex AI error:", errText);
    throw new Error(`Vertex AI call failed: ${res.status}`);
  }

  const data = await res.json();

  // Parse Claude response
  let code = "";
  let explanation = "";
  let thinking = "";

  if (data.content) {
    for (const block of data.content) {
      if (block.type === "thinking") {
        thinking = block.thinking || "";
      } else if (block.type === "text") {
        const text = block.text || "";
        // Extract code blocks
        const codeMatch = text.match(/```[\w]*\n([\s\S]*?)```/);
        if (codeMatch) {
          code = codeMatch[1].trim();
          explanation = text.replace(/```[\w]*\n[\s\S]*?```/g, "").trim();
        } else {
          code = text;
        }
      }
    }
  }

  return { code, explanation, thinking };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, language = "typescript", mode = "generate" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callClaude(prompt, language, mode);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        model: MODEL_ID,
        provider: "Vertex AI",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Code gen error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Code generation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
