/**
 * Hushh Studio - Veo 3.1 Video Generation Edge Function
 * Proxies video generation requests to Vertex AI using GCP paid billing
 */

import { corsHeaders } from '../_shared/cors.ts';

const PROJECT_ID = Deno.env.get('GCP_PROJECT_ID') || 'hushone-app';
const LOCATION = Deno.env.get('GCP_LOCATION') || 'us-central1';
const GCP_SERVICE_ACCOUNT_KEY = Deno.env.get('GCP_SERVICE_ACCOUNT_KEY');

interface VideoGenerationRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  action?: 'generate' | 'poll';
  operationName?: string;
}

interface VideoGenerationResponse {
  success: boolean;
  operationName?: string;
  done?: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * Get GCP access token using service account
 */
async function getAccessToken(): Promise<string> {
  if (!GCP_SERVICE_ACCOUNT_KEY) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY not configured');
  }

  const serviceAccount = JSON.parse(GCP_SERVICE_ACCOUNT_KEY);
  
  // Create JWT for service account
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };

  // Encode JWT parts
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const privateKey = serviceAccount.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Start video generation
 */
async function startVideoGeneration(
  prompt: string,
  aspectRatio: string,
  accessToken: string
): Promise<{ operationName: string }> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-preview:predictLongRunning`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Video generation failed');
  }

  const data = await response.json();
  return { operationName: data.name };
}

/**
 * Poll operation status
 */
async function pollOperation(
  operationName: string,
  accessToken: string
): Promise<{ done: boolean; videoUrl?: string; error?: string }> {
  // Extract operation ID from full operation name
  // Format: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{op_id}
  const operationIdMatch = operationName.match(/operations\/([^/]+)$/);
  const operationId = operationIdMatch ? operationIdMatch[1] : operationName;
  
  // Use standard Vertex AI operations endpoint
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/operations/${operationId}`;

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Poll failed');
  }

  const data = await response.json();

  if (data.done) {
    if (data.error) {
      return { done: true, error: data.error.message };
    }

    const generatedVideos = data.response?.generatedVideos;
    if (generatedVideos && generatedVideos.length > 0) {
      const videoUri = generatedVideos[0].video?.uri || generatedVideos[0].video?.url;
      return { done: true, videoUrl: videoUri };
    }

    return { done: true, error: 'No video generated' };
  }

  return { done: false };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: VideoGenerationRequest = await req.json();
    const { prompt, aspectRatio = '16:9', action = 'generate', operationName } = body;

    // Get access token
    const accessToken = await getAccessToken();

    let result: VideoGenerationResponse;

    if (action === 'poll' && operationName) {
      // Poll for operation status
      const pollResult = await pollOperation(operationName, accessToken);
      result = {
        success: true,
        operationName,
        done: pollResult.done,
        videoUrl: pollResult.videoUrl,
        error: pollResult.error
      };
    } else if (action === 'generate' && prompt) {
      // Start video generation
      const genResult = await startVideoGeneration(prompt, aspectRatio, accessToken);
      result = {
        success: true,
        operationName: genResult.operationName,
        done: false
      };
    } else {
      throw new Error('Invalid request: provide prompt for generate or operationName for poll');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Veo generation error:', error);
    
    const response: VideoGenerationResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
