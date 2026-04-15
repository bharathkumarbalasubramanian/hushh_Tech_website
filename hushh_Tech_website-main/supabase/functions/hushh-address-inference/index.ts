// Hushh Address Inference API - Supabase Edge Function
// Lightweight Address Intelligence Engine v1.0
// Uses Gemini 3 Pro Preview via Vertex AI with Google Search grounding
// Focus: Address, City, State, Country, Nationality ONLY
// Target response time: 5-10 seconds

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Vertex AI Configuration
const PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "hushone-app";
const MODEL_ID = "gemini-2.0-flash-001"; // Faster model for address-only inference
const VERTEX_AI_LOCATION = "us-central1";

// =============================================================================
// TYPES
// =============================================================================
interface AddressResult {
  success: boolean;
  address: {
    line1: string | null;
    line2: string | null;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    zipCode: string | null;
  };
  nationality: string;
  confidence: number;
  sources: string[];
  inferenceMethod: string;
}

interface SearchParams {
  name: string;
  email?: string;
  country?: string;
}

// =============================================================================
// NAME INTELLIGENCE (Lightweight version)
// =============================================================================
interface NameIntelligence {
  firstName: string;
  lastName: string;
  culturalOrigin: string;
  searchQueries: string[];
}

const CULTURAL_PATTERNS: Record<string, { origins: string[]; likelyCountries: string[] }> = {
  // Indian names
  'kumar|singh|sharma|patel|gupta|verma|jain|mehta|reddy|rao|iyer|nair|menon|pillai|nayak|saxena': {
    origins: ['Indian', 'South Asian'],
    likelyCountries: ['India', 'United States', 'United Kingdom', 'Canada', 'UAE', 'Singapore']
  },
  // Chinese names
  'wang|li|zhang|liu|chen|yang|huang|zhao|wu|zhou|xu|sun|ma|zhu|hu|guo|luo|wei': {
    origins: ['Chinese', 'East Asian'],
    likelyCountries: ['China', 'Taiwan', 'United States', 'Canada', 'Singapore', 'Malaysia']
  },
  // Arabic/Middle Eastern names
  'khan|ahmed|mohammad|ali|hassan|hussein|omar|salem|al-|bin|ibn': {
    origins: ['Arabic', 'Middle Eastern', 'South Asian'],
    likelyCountries: ['UAE', 'Saudi Arabia', 'Pakistan', 'India', 'United Kingdom', 'United States']
  },
  // Japanese names
  'yamamoto|tanaka|watanabe|ito|yamada|nakamura|kobayashi|kato|yoshida|yamamoto|sasaki|yamaguchi|matsumoto': {
    origins: ['Japanese', 'East Asian'],
    likelyCountries: ['Japan', 'United States', 'Brazil']
  },
  // Korean names
  'kim|lee|park|choi|jung|kang|cho|yoon|jang|lim|han|shin|seo|kwon|hwang': {
    origins: ['Korean', 'East Asian'],
    likelyCountries: ['South Korea', 'United States', 'Canada']
  },
  // Hispanic/Latin names
  'garcia|rodriguez|martinez|hernandez|lopez|gonzalez|perez|sanchez|ramirez|torres|flores|rivera|gomez|diaz': {
    origins: ['Hispanic', 'Latin American'],
    likelyCountries: ['Mexico', 'United States', 'Spain', 'Colombia', 'Argentina', 'Brazil']
  },
};

const analyzeNameCulture = (fullName: string): NameIntelligence => {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts[parts.length - 1] || '';
  
  let culturalOrigin = 'Unknown';
  let likelyCountries: string[] = ['United States', 'United Kingdom', 'Canada'];
  
  // Check against cultural patterns
  for (const [pattern, info] of Object.entries(CULTURAL_PATTERNS)) {
    const patternParts = pattern.split('|');
    if (patternParts.some(p => lastName.includes(p) || firstName.includes(p))) {
      culturalOrigin = info.origins[0];
      likelyCountries = info.likelyCountries;
      break;
    }
  }
  
  // Generate search queries
  const searchQueries = [
    `"${fullName}" location`,
    `"${fullName}" address`,
    `"${fullName}" city`,
    `${fullName} LinkedIn profile`,
    `${fullName} where does live`,
  ];
  
  return {
    firstName: parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || '',
    lastName: parts[parts.length - 1]?.charAt(0).toUpperCase() + parts[parts.length - 1]?.slice(1) || '',
    culturalOrigin,
    searchQueries,
  };
};

// =============================================================================
// EMAIL DOMAIN INTELLIGENCE (Lightweight)
// =============================================================================
const extractLocationFromEmail = (email: string): { company?: string; hint?: string } => {
  if (!email) return {};
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return {};
  
  // Corporate domains with known HQ locations
  const CORP_LOCATIONS: Record<string, { company: string; hint: string }> = {
    'google.com': { company: 'Google', hint: 'Mountain View, CA, USA or Global' },
    'microsoft.com': { company: 'Microsoft', hint: 'Seattle/Redmond, WA, USA or Global' },
    'apple.com': { company: 'Apple', hint: 'Cupertino, CA, USA or Global' },
    'amazon.com': { company: 'Amazon', hint: 'Seattle, WA, USA or Global' },
    'meta.com': { company: 'Meta', hint: 'Menlo Park, CA, USA or Global' },
    'facebook.com': { company: 'Meta', hint: 'Menlo Park, CA, USA or Global' },
    'nvidia.com': { company: 'NVIDIA', hint: 'Santa Clara, CA, USA or Global' },
    'tesla.com': { company: 'Tesla', hint: 'Austin, TX or Palo Alto, CA, USA' },
    'openai.com': { company: 'OpenAI', hint: 'San Francisco, CA, USA' },
    'anthropic.com': { company: 'Anthropic', hint: 'San Francisco, CA, USA' },
    'tcs.com': { company: 'TCS', hint: 'Mumbai, India or Global' },
    'infosys.com': { company: 'Infosys', hint: 'Bangalore, India or Global' },
    'wipro.com': { company: 'Wipro', hint: 'Bangalore, India or Global' },
    'hcl.com': { company: 'HCL', hint: 'Noida, India or Global' },
  };
  
  // Check known corporations
  for (const [d, info] of Object.entries(CORP_LOCATIONS)) {
    if (domain === d || domain.endsWith(`.${d}`)) {
      return info;
    }
  }
  
  // For personal email domains, no location hint
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
  if (personalDomains.includes(domain)) {
    return {};
  }
  
  // For corporate email, extract company name from domain
  const domainParts = domain.split('.');
  if (domainParts.length >= 2) {
    const company = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    return { company };
  }
  
  return {};
};

// =============================================================================
// VERTEX AI AUTHENTICATION
// =============================================================================
const getAccessToken = async (): Promise<string> => {
  // Try different token sources
  const accessToken = Deno.env.get("GCP_ACCESS_TOKEN") || Deno.env.get("GOOGLE_ACCESS_TOKEN");
  if (accessToken && accessToken.length > 50) {
    console.log("[AddressInference] Using GCP_ACCESS_TOKEN from environment");
    return accessToken;
  }
  
  // Try to get token from service account JSON
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    try {
      console.log("[AddressInference] Generating access token from service account...");
      const sa = JSON.parse(serviceAccountJson);
      
      if (!sa.private_key || !sa.client_email) {
        throw new Error("Service account JSON missing private_key or client_email");
      }
      
      // Generate JWT for OAuth
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        iss: sa.client_email,
        sub: sa.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
      };
      
      // Base64URL encode header and payload
      const encoder = new TextEncoder();
      const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const unsignedJwt = `${headerB64}.${payloadB64}`;
      
      // Parse the PEM private key
      let privateKeyPem = sa.private_key;
      if (!privateKeyPem.includes('\n') && privateKeyPem.includes('\\n')) {
        privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
      }
      
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const startIdx = privateKeyPem.indexOf(pemHeader);
      const endIdx = privateKeyPem.indexOf(pemFooter);
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("Invalid PEM format");
      }
      
      const pemBody = privateKeyPem
        .substring(startIdx + pemHeader.length, endIdx)
        .replace(/[\r\n\s]/g, '');
      
      const binaryString = atob(pemBody);
      const binaryKey = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryKey[i] = binaryString.charCodeAt(i);
      }
      
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey.buffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        encoder.encode(unsignedJwt)
      );
      
      const signatureArray = new Uint8Array(signature);
      let signatureB64 = '';
      for (let i = 0; i < signatureArray.length; i++) {
        signatureB64 += String.fromCharCode(signatureArray[i]);
      }
      signatureB64 = btoa(signatureB64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const signedJwt = `${unsignedJwt}.${signatureB64}`;
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(`Token exchange failed: ${tokenData.error}`);
      }
      
      if (tokenData.access_token) {
        console.log("[AddressInference] Successfully obtained OAuth access token");
        return tokenData.access_token;
      }
      
      throw new Error("Token response missing access_token");
    } catch (e) {
      console.error("[AddressInference] Failed to get access token:", e);
      throw e;
    }
  }
  
  throw new Error("No valid GCP access token found");
};

// =============================================================================
// VERTEX AI CALL (Lightweight - Gemini 2.0 Flash)
// =============================================================================
const callVertexAI = async (prompt: string): Promise<any> => {
  const accessToken = await getAccessToken();
  
  const endpoint = `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;
  
  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3, // Lower temperature for more factual responses
      maxOutputTokens: 2048, // Much smaller than full profile search
    },
    // Google Search Grounding - enables real-time web search
    tools: [{
      googleSearch: {}
    }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };
  
  console.log(`[AddressInference] Calling Vertex AI ${MODEL_ID}`);
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AddressInference] Vertex AI Error:", errorText);
    throw new Error(`Vertex AI API error: ${response.status}`);
  }
  
  return await response.json();
};

// =============================================================================
// COUNTRY CODE MAPPING
// =============================================================================
const COUNTRY_TO_ISO: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'india': 'IN',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'canada': 'CA',
  'australia': 'AU',
  'germany': 'DE',
  'france': 'FR',
  'japan': 'JP',
  'china': 'CN',
  'singapore': 'SG',
  'united arab emirates': 'AE', 'uae': 'AE', 'dubai': 'AE',
  'brazil': 'BR',
  'mexico': 'MX',
  'spain': 'ES',
  'italy': 'IT',
  'netherlands': 'NL', 'holland': 'NL',
  'south korea': 'KR', 'korea': 'KR',
  'taiwan': 'TW',
  'hong kong': 'HK',
  'israel': 'IL',
  'ireland': 'IE',
  'new zealand': 'NZ',
  'sweden': 'SE',
  'switzerland': 'CH',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'belgium': 'BE',
  'austria': 'AT',
  'poland': 'PL',
  'russia': 'RU',
  'south africa': 'ZA',
  'nigeria': 'NG',
  'kenya': 'KE',
  'egypt': 'EG',
  'saudi arabia': 'SA',
  'qatar': 'QA',
  'kuwait': 'KW',
  'pakistan': 'PK',
  'bangladesh': 'BD',
  'indonesia': 'ID',
  'malaysia': 'MY',
  'thailand': 'TH',
  'vietnam': 'VN',
  'philippines': 'PH',
};

const getCountryCode = (country: string): string => {
  const normalized = country.toLowerCase().trim();
  return COUNTRY_TO_ISO[normalized] || country.toUpperCase().slice(0, 2);
};

// =============================================================================
// ADDRESS INFERENCE ENGINE
// =============================================================================
const inferAddress = async (params: SearchParams): Promise<AddressResult> => {
  const { name, email, country } = params;
  
  console.log(`[AddressInference] Starting address inference for: ${name}`);
  const startTime = Date.now();
  
  // Pre-compute intelligence signals
  const nameIntel = analyzeNameCulture(name);
  const emailIntel = extractLocationFromEmail(email || '');
  
  console.log(`[AddressInference] Name culture: ${nameIntel.culturalOrigin}`);
  if (emailIntel.company) {
    console.log(`[AddressInference] Email company: ${emailIntel.company}`);
  }
  
  // Build focused prompt for address inference only
  const prompt = `
# ADDRESS LOCATION INFERENCE ENGINE

## OBJECTIVE
Determine the most likely current residential location for the following person using web search.
Focus ONLY on location data - ignore all other personal information.

## TARGET
- **Name**: "${name}"
- **Email**: "${email || 'Not provided'}"
${country ? `- **Hint Country**: "${country}"` : ''}

## INTELLIGENCE SIGNALS (Pre-computed)
- **Name Cultural Origin**: ${nameIntel.culturalOrigin}
${emailIntel.company ? `- **Email Company**: ${emailIntel.company} (${emailIntel.hint})` : '- **Email**: Personal email (no company signal)'}

## SEARCH STRATEGY
1. Search for "${name}" on LinkedIn, Twitter, and professional networks
2. Look for location mentions in profiles, bios, or about sections
3. Check company pages if corporate email is used
4. Infer from cultural name patterns if no direct data found

## INFERENCE RULES
- If LinkedIn profile found → Extract city, state, country from profile
- If company email → Check if they might be at HQ or regional office
- If cultural name pattern matches → Use most likely country for that culture
- Default confidence: 70% for cultural inference, 90% for verified profiles

## OUTPUT FORMAT (STRICT JSON)
Respond ONLY with valid JSON in this exact format:

\`\`\`json
{
  "city": "City name or null",
  "state": "State/Province or null", 
  "country": "Country name",
  "countryCode": "ISO 2-letter code",
  "nationality": "Likely nationality",
  "confidence": 0-100,
  "inferenceMethod": "linkedin_profile | twitter_bio | company_email | cultural_pattern | web_search | default",
  "sources": ["List of sources used"]
}
\`\`\`

## IMPORTANT
- Return ONLY the JSON block, no other text
- city and state can be null if not found
- country and countryCode are REQUIRED
- Be conservative with confidence scores
- If no data found, use cultural pattern inference with 60-70% confidence
`;

  try {
    const response = await callVertexAI(prompt);
    
    // Extract text from response
    let text = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      text = response.candidates[0].content.parts
        .map((part: any) => part.text || "")
        .join("");
    }
    
    console.log(`[AddressInference] Raw response: ${text.substring(0, 500)}...`);
    
    // Extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log("[AddressInference] No JSON found, using fallback");
      throw new Error("No JSON in response");
    }
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr.trim());
    
    const elapsed = Date.now() - startTime;
    console.log(`[AddressInference] Completed in ${elapsed}ms`);
    
    return {
      success: true,
      address: {
        line1: null,
        line2: null,
        city: parsed.city || '',
        state: parsed.state || '',
        country: parsed.country || 'United States',
        countryCode: parsed.countryCode || getCountryCode(parsed.country || 'US'),
        zipCode: null,
      },
      nationality: parsed.nationality || 'Unknown',
      confidence: parsed.confidence || 60,
      sources: parsed.sources || [],
      inferenceMethod: parsed.inferenceMethod || 'cultural_pattern',
    };
    
  } catch (error) {
    console.error("[AddressInference] Error:", error);
    
    // Fallback to cultural pattern inference
    const culturalOrigin = nameIntel.culturalOrigin;
    let fallbackCountry = 'United States';
    let fallbackCode = 'US';
    
    // Map cultural origin to most likely country
    const CULTURE_TO_COUNTRY: Record<string, { country: string; code: string }> = {
      'Indian': { country: 'India', code: 'IN' },
      'South Asian': { country: 'India', code: 'IN' },
      'Chinese': { country: 'China', code: 'CN' },
      'East Asian': { country: 'China', code: 'CN' },
      'Japanese': { country: 'Japan', code: 'JP' },
      'Korean': { country: 'South Korea', code: 'KR' },
      'Arabic': { country: 'United Arab Emirates', code: 'AE' },
      'Middle Eastern': { country: 'United Arab Emirates', code: 'AE' },
      'Hispanic': { country: 'Mexico', code: 'MX' },
      'Latin American': { country: 'Mexico', code: 'MX' },
    };
    
    if (CULTURE_TO_COUNTRY[culturalOrigin]) {
      fallbackCountry = CULTURE_TO_COUNTRY[culturalOrigin].country;
      fallbackCode = CULTURE_TO_COUNTRY[culturalOrigin].code;
    }
    
    // If country hint provided, use it
    if (country) {
      fallbackCountry = country;
      fallbackCode = getCountryCode(country);
    }
    
    return {
      success: true,
      address: {
        line1: null,
        line2: null,
        city: '',
        state: '',
        country: fallbackCountry,
        countryCode: fallbackCode,
        zipCode: null,
      },
      nationality: culturalOrigin !== 'Unknown' ? culturalOrigin : fallbackCountry,
      confidence: 50,
      sources: ['cultural_pattern_fallback'],
      inferenceMethod: 'cultural_pattern_fallback',
    };
  }
};

// =============================================================================
// HTTP HANDLER
// =============================================================================
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { name, email, country } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AddressInference] Request received for: ${name}`);
    
    const result = await inferAddress({ name, email, country });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AddressInference] API Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
