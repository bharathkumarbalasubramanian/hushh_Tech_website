/**
 * Hushh AI Chat - Supabase Edge Function
 * Vertex AI integration with Gemini 2.0 Flash
 * Streaming response for real-time chat
 * Supabase integration for rate limiting & caching
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  checkRateLimit,
  checkMediaUploadLimit,
  incrementMediaUpload,
  cacheContext,
  getCachedContext,
  cacheResponse,
  getCachedResponse,
  trackUsage,
  hashQuery,
  saveStreamState,
  clearStreamState,
} from './supabase.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// GCP Configuration
const GCP_PROJECT = 'hushone-app';
const GCP_LOCATION = 'us-central1';

// Available AI Models (white-labeled as Hushh AI variants)
// All use Gemini 2.0 Flash - differentiated by temperature & tokens
const AVAILABLE_MODELS = {
  // Fast & Efficient (Default) - Lower temperature, shorter responses
  'flash': {
    id: 'gemini-2.0-flash-001',
    name: 'Hushh Flash',
    description: 'Fast responses, great for quick tasks',
    maxTokens: 2048,
    temperature: 0.4,
  },
  // Balanced Performance - Medium settings
  'standard': {
    id: 'gemini-2.0-flash-001',
    name: 'Hushh Standard',
    description: 'Balanced speed and quality',
    maxTokens: 4096,
    temperature: 0.6,
  },
  // Creative - Higher temperature for more creative outputs
  'pro': {
    id: 'gemini-2.0-flash-001',
    name: 'Hushh Pro',
    description: 'Best for complex & creative tasks',
    maxTokens: 8192,
    temperature: 0.8,
  },
  // Advanced - Maximum capability with full output
  'advanced': {
    id: 'gemini-2.0-flash-001',
    name: 'Hushh Advanced',
    description: 'Detailed responses with enhanced reasoning',
    maxTokens: 8192,
    temperature: 0.9,
  },
} as const;

type ModelKey = keyof typeof AVAILABLE_MODELS;
const DEFAULT_MODEL: ModelKey = 'flash';

// System prompt for Hushh AI
const SYSTEM_PROMPT = `You are Hushh, a helpful and friendly AI assistant. You are:
- Warm, conversational, and empathetic
- Clear and concise in your explanations
- Honest about limitations
- Helpful with a wide range of tasks including writing, analysis, coding, and general questions

Guidelines:
- Never mention that you are powered by Gemini, Google, or any specific AI model
- Always refer to yourself as "Hushh" or "Hushh AI"
- Be helpful and maintain a positive, supportive tone
- Format responses with proper markdown when appropriate
- Keep responses focused and relevant`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  chatId: string;
  userId?: string;
  mediaUrls?: string[];
  history?: ChatMessage[];
  model?: ModelKey; // Selected AI model (flash, standard, pro, advanced)
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // GET request to list available models
  if (req.method === 'GET') {
    const models = Object.entries(AVAILABLE_MODELS).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      isDefault: key === DEFAULT_MODEL,
    }));
    
    return new Response(
      JSON.stringify({ models, defaultModel: DEFAULT_MODEL }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { message, chatId, userId, mediaUrls = [], history = [], model } = body;
    
    // Validate and get model configuration (handle string input)
    const modelKey = (model && model in AVAILABLE_MODELS) ? model as ModelKey : DEFAULT_MODEL;
    const selectedModel = AVAILABLE_MODELS[modelKey];
    
    console.log('Requested model:', model, '-> Using:', modelKey, selectedModel.name);

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // Supabase: Rate Limiting (100 requests/minute)
    // ============================================
    if (userId) {
      const rateLimit = await checkRateLimit(userId, 100, 60);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            retryAfter: rateLimit.resetIn,
            remaining: rateLimit.remaining 
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'Retry-After': String(rateLimit.resetIn),
            } 
          }
        );
      }
    }

    // ============================================
    // Supabase: Check Media Upload Limit (20/day)
    // ============================================
    if (userId && mediaUrls.length > 0) {
      const mediaLimit = await checkMediaUploadLimit(userId);
      if (!mediaLimit.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily media upload limit reached (20/day)', 
            resetsAt: mediaLimit.resetsAt,
            used: mediaLimit.used,
            remaining: 0
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Increment upload count for each media
      for (let i = 0; i < mediaUrls.length; i++) {
        await incrementMediaUpload(userId);
      }
    }

    // ============================================
    // Supabase: Check Cache for Similar Query
    // ============================================
    const queryHash = hashQuery(message + chatId);
    const cachedResponse = await getCachedResponse(queryHash);
    if (cachedResponse && mediaUrls.length === 0) {
      // Track cache hit
      await trackUsage('cache_hit');
      
      return new Response(cachedResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Cache': 'HIT',
        },
      });
    }

    // ============================================
    // Supabase: Get Cached Context or Use Provided History
    // ============================================
    let conversationHistory = history;
    if (chatId && history.length === 0) {
      const cachedHistory = await getCachedContext(chatId);
      if (cachedHistory) {
        conversationHistory = cachedHistory as ChatMessage[];
      }
    }

    // Track usage
    await trackUsage('chat_request');

    // Get access token for Vertex AI
    let accessToken: string | null = null;
    try {
      accessToken = await getAccessToken();
    } catch (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication error', details: String(authError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with AI service - no token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Got access token, length:', accessToken.length);

    // Build conversation history
    const contents = buildContents(history, message, mediaUrls);

    // Call Vertex AI with selected model
    console.log('Using model:', selectedModel.name, '(' + selectedModel.id + ')');
    const response = await callVertexAI(accessToken, contents, selectedModel);

    // ============================================
    // Supabase: Wrap stream to cache response & update context
    // ============================================
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    let fullResponse = '';
    const messageId = crypto.randomUUID();

    const cachedStream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          // Save streaming state for resumability
          if (chatId && userId) {
            await saveStreamState(chatId, messageId, fullResponse);
          }
          
          controller.enqueue(value);
        }

        // ============================================
        // Supabase: Cache completed response
        // ============================================
        if (fullResponse && mediaUrls.length === 0) {
          await cacheResponse(queryHash, fullResponse, 1800); // 30 min cache
        }

        // ============================================
        // Supabase: Update cached context
        // ============================================
        if (chatId) {
          const updatedHistory = [
            ...conversationHistory,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: fullResponse },
          ].slice(-20); // Keep last 20 messages
          
          await cacheContext(chatId, updatedHistory, 3600); // 1 hour cache
        }

        // Clear stream state
        if (chatId && userId) {
          await clearStreamState(chatId, messageId);
        }

        // Track successful completion
        await trackUsage('chat_success');

        controller.close();
      },
    });

    // Return streaming response
    return new Response(cachedStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Cache': 'MISS',
        'X-Message-Id': messageId,
      },
    });

  } catch (error) {
    console.error('Error in hushh-ai-chat:', error);
    
    // Track error
    await trackUsage('chat_error');
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get Google Cloud access token using service account
 */
async function getAccessToken(): Promise<string | null> {
  try {
    // Try to get service account credentials from env
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (serviceAccountKey) {
      const credentials = JSON.parse(serviceAccountKey);
      return await getAccessTokenFromServiceAccount(credentials);
    }

    // Fallback: Try to use default credentials (for local dev)
    const metadataUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * Base64url encode (URL-safe base64 without padding)
 */
function base64url(input: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  
  // Convert to URL-safe base64
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Get access token from service account JSON
 */
async function getAccessTokenFromServiceAccount(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Use base64url encoding for JWT (RFC 7519)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }));

  const signatureInput = `${header}.${payload}`;
  
  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(credentials.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  // Use base64url encoding for signature
  const jwt = `${signatureInput}.${base64url(signature)}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', tokenResponse.status, errorText);
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error('No access_token in response:', tokenData);
    throw new Error('No access_token received');
  }
  
  return tokenData.access_token;
}

/**
 * Convert PEM to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Build contents array for Vertex AI
 */
function buildContents(
  history: ChatMessage[],
  message: string,
  mediaUrls: string[]
): Array<{ role: string; parts: Array<{ text?: string; fileData?: { mimeType: string; fileUri: string } }> }> {
  const contents: Array<{ role: string; parts: Array<{ text?: string; fileData?: { mimeType: string; fileUri: string } }> }> = [];

  // Add system instruction via first user message
  contents.push({
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: "I understand. I'm Hushh, your helpful AI assistant. How can I help you today?" }],
  });

  // Add history (limit to last 20 messages for context window)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  // Add current message with media if any
  const currentParts: Array<{ text?: string; fileData?: { mimeType: string; fileUri: string } }> = [];

  // Add media files
  for (const url of mediaUrls) {
    const mimeType = getMimeType(url);
    if (mimeType) {
      currentParts.push({
        fileData: {
          mimeType,
          fileUri: url,
        },
      });
    }
  }

  // Add text message
  currentParts.push({ text: message });

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  return contents;
}

/**
 * Get MIME type from URL
 */
function getMimeType(url: string): string | null {
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
  };
  return extension ? mimeTypes[extension] || null : null;
}

// Model configuration interface
interface ModelConfig {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Call Vertex AI with selected model
 */
async function callVertexAI(
  accessToken: string,
  contents: Array<{ role: string; parts: Array<{ text?: string; fileData?: { mimeType: string; fileUri: string } }> }>,
  modelConfig: ModelConfig
): Promise<Response> {
  // Build endpoint with selected model
  const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/publishers/google/models/${modelConfig.id}:generateContent`;

  const requestBody = {
    contents,
    generationConfig: {
      temperature: modelConfig.temperature,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: modelConfig.maxTokens,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  console.log('Calling Vertex AI endpoint:', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Vertex AI error:', error);
    throw new Error(`Vertex AI error: ${response.status} - ${error}`);
  }

  // Parse non-streaming response
  const data = await response.json();
  console.log('Vertex AI response:', JSON.stringify(data).slice(0, 500));
  
  // Extract text from response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    console.error('No text in Vertex AI response:', JSON.stringify(data));
    throw new Error('No text content in AI response');
  }
  
  // Return as simple text stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return new Response(stream);
}
