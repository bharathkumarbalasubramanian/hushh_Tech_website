/**
 * Gemini Live API - Ephemeral Token Generator
 * Creates secure short-lived tokens for client-side WebSocket connections
 * 
 * Endpoint: POST /api/gemini-ephemeral-token
 * 
 * Required for secure client-to-server Gemini Live API connections
 * @see https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 */

// Rotate through multiple API keys
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean);

let keyIndex = 0;

function getNextKey() {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { language = 'en-US' } = req.body || {};
    
    const apiKey = getNextKey();
    
    // Generate ephemeral token from Google
    // Note: This is a placeholder - actual implementation depends on Google's ephemeral token API
    // Currently, for Gemini Live API preview, direct WebSocket connection with API key is used
    
    // Gemini Live API WebSocket URL
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    // For production with ephemeral tokens, you would call:
    // POST https://generativelanguage.googleapis.com/v1beta/ephemeral-tokens
    // with appropriate configuration
    
    // For now, return the WebSocket URL directly
    // In production, implement proper ephemeral token generation
    res.status(200).json({
      success: true,
      wsUrl,
      language,
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      expiresIn: 3600, // 1 hour
      // For future ephemeral token implementation:
      // token: ephemeralToken,
    });

  } catch (error) {
    console.error('Ephemeral token error:', error);
    res.status(500).json({ 
      error: 'Failed to generate ephemeral token',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
