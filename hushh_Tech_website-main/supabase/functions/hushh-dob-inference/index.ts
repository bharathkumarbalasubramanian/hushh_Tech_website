// Hushh DOB Inference API - Supabase Edge Function
// Uses Gemini 3 Flash Preview via Vertex AI with Google Search grounding
// Infers Date of Birth using name, address, and public records

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Vertex AI Configuration - Using gemini-3-flash-preview for FASTER response
const PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "hushone-app";
const MODEL_ID = "gemini-2.5-flash-preview-05-20";  // Gemini 2.5 Flash Preview - FASTER than Pro
const VERTEX_AI_LOCATION = "us-central1";  // Use regional endpoint for lower latency

interface DobInferenceRequest {
  name: string;
  email?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  residenceCountry?: string;
  phone?: string;
}

interface DobInferenceResult {
  dob: string | null;  // Format: YYYY-MM-DD
  dobDisplay: string | null;  // Format: MM/DD/YYYY for display
  age: number | null;
  confidence: number;  // 0-100
  sources: string[];
  reasoning: string;
}

// Get OAuth access token for Vertex AI (from Service Account)
const getAccessToken = async (): Promise<string> => {
  // Try different token sources - check for fresh OAuth token first
  const accessToken = Deno.env.get("GCP_ACCESS_TOKEN") || Deno.env.get("GOOGLE_ACCESS_TOKEN");
  if (accessToken && accessToken.length > 50) {
    console.log("Using GCP_ACCESS_TOKEN from environment");
    return accessToken;
  }
  
  // Try to get token from service account JSON
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    try {
      console.log("Attempting to generate access token from service account...");
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
      
      // Parse the PEM private key properly
      let privateKeyPem = sa.private_key;
      if (!privateKeyPem.includes('\n') && privateKeyPem.includes('\\n')) {
        privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
      }
      
      // Extract the base64 content between PEM headers
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const startIdx = privateKeyPem.indexOf(pemHeader);
      const endIdx = privateKeyPem.indexOf(pemFooter);
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("Invalid PEM format: missing headers");
      }
      
      const pemBody = privateKeyPem
        .substring(startIdx + pemHeader.length, endIdx)
        .replace(/[\r\n\s]/g, '');
      
      // Decode base64 to binary
      const binaryString = atob(pemBody);
      const binaryKey = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryKey[i] = binaryString.charCodeAt(i);
      }
      
      // Import the private key using Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey.buffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      // Sign the JWT
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        encoder.encode(unsignedJwt)
      );
      
      // Base64URL encode the signature
      const signatureArray = new Uint8Array(signature);
      let signatureB64 = '';
      for (let i = 0; i < signatureArray.length; i++) {
        signatureB64 += String.fromCharCode(signatureArray[i]);
      }
      signatureB64 = btoa(signatureB64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const signedJwt = `${unsignedJwt}.${signatureB64}`;
      
      console.log(`Generated signed JWT for ${sa.client_email}`);
      
      // Exchange JWT for access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error("Token exchange error:", tokenData.error, tokenData.error_description);
        throw new Error(`Token exchange failed: ${tokenData.error} - ${tokenData.error_description}`);
      }
      
      if (tokenData.access_token) {
        console.log("Successfully obtained OAuth access token from service account");
        return tokenData.access_token;
      }
      
      throw new Error("Token response missing access_token field");
    } catch (e) {
      console.error("Failed to get access token from service account:", e);
      throw e;
    }
  }
  
  throw new Error("No valid GCP access token found. Please set GCP_ACCESS_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON");
};

// Call Vertex AI Gemini API with Google Search grounding
const callVertexAI = async (prompt: string): Promise<any> => {
  const accessToken = await getAccessToken();
  
  // Vertex AI endpoint as per user's curl example
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;
  
  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,  // Lower temperature for factual data
      maxOutputTokens: 4096,
    },
    // Google Search Grounding - enables real-time web search
    tools: [{
      googleSearch: {}
    }],
    // Safety settings
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };
  
  console.log(`🔍 Calling Vertex AI (${MODEL_ID}) with Google Search grounding`);
  console.log(`📡 Endpoint: ${endpoint}`);
  
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
    console.error("Vertex AI Error:", errorText);
    throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
};

// Parse DOB from Gemini response - Enhanced with multiple format support
const parseDobResponse = (text: string): DobInferenceResult => {
  const result: DobInferenceResult = {
    dob: null,
    dobDisplay: null,
    age: null,
    confidence: 0,
    sources: [],
    reasoning: ""
  };
  
  console.log("🔍 Full Gemini response text:", text);
  
  // Try multiple DOB formats
  // Format 1: DOB: YYYY-MM-DD
  let dobMatch = text.match(/DOB:\s*(\d{4}-\d{2}-\d{2})/i);
  
  // Format 2: **DOB:** YYYY-MM-DD (markdown)
  if (!dobMatch) {
    dobMatch = text.match(/\*\*DOB:?\*\*\s*(\d{4}-\d{2}-\d{2})/i);
  }
  
  // Format 3: Date of Birth: YYYY-MM-DD
  if (!dobMatch) {
    dobMatch = text.match(/Date\s+of\s+Birth:\s*(\d{4}-\d{2}-\d{2})/i);
  }
  
  // Format 4: Born: YYYY-MM-DD
  if (!dobMatch) {
    dobMatch = text.match(/Born:\s*(\d{4}-\d{2}-\d{2})/i);
  }
  
  // Format 5: Just a date in YYYY-MM-DD format
  if (!dobMatch) {
    dobMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  }
  
  if (dobMatch) {
    result.dob = dobMatch[1];
    const [year, month, day] = dobMatch[1].split('-');
    result.dobDisplay = `${month}/${day}/${year}`;
    
    // Calculate age
    const birthDate = new Date(dobMatch[1]);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    result.age = age;
    console.log(`✅ Parsed DOB: ${result.dob}, Age: ${result.age}`);
  } else {
    // Try to extract just birth year
    console.log("🔍 No full DOB found, looking for birth year...");
    
    // Pattern: birth year as 1998, birth year is 1998, born in 1998
    const yearMatch = text.match(/birth\s+year\s+(?:as|is|of|:)?\s*(\d{4})/i) ||
                      text.match(/born\s+in\s+(\d{4})/i) ||
                      text.match(/(\d{4})\s+birth\s+year/i) ||
                      text.match(/year\s+of\s+birth[:\s]+(\d{4})/i);
    
    if (yearMatch) {
      const year = yearMatch[1];
      // Use June 15 as default day/month (middle of year)
      result.dob = `${year}-06-15`;
      result.dobDisplay = `06/15/${year}`;
      result.age = 2026 - parseInt(year, 10);
      console.log(`✅ Extracted birth year: ${year}, Age: ${result.age}`);
    } else {
      console.log("❌ No DOB or birth year pattern found in response");
    }
  }
  
  // Extract confidence - multiple formats
  let confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
  if (!confidenceMatch) {
    confidenceMatch = text.match(/\*\*CONFIDENCE:?\*\*\s*(\d+)/i);
  }
  if (!confidenceMatch) {
    confidenceMatch = text.match(/confidence[:\s]+(\d+)/i);
  }
  
  if (confidenceMatch) {
    result.confidence = Math.min(100, parseInt(confidenceMatch[1], 10));
    console.log(`✅ Parsed confidence: ${result.confidence}%`);
  }
  
  // Extract sources - multiple formats
  let sourcesMatch = text.match(/SOURCES:\s*(.+?)(?=\n|$)/i);
  if (!sourcesMatch) {
    sourcesMatch = text.match(/\*\*SOURCES:?\*\*\s*(.+?)(?=\n|$)/i);
  }
  if (sourcesMatch) {
    result.sources = sourcesMatch[1].split(',').map(s => s.trim()).filter(s => s && s.length > 2);
  }
  
  // Extract reasoning - multiple formats
  let reasoningMatch = text.match(/REASONING:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  if (!reasoningMatch) {
    reasoningMatch = text.match(/\*\*REASONING:?\*\*\s*(.+?)(?=\n\*\*|$)/is);
  }
  if (reasoningMatch) {
    result.reasoning = reasoningMatch[1].trim();
  }
  
  // If we found a DOB but no confidence, set a default based on context
  if (result.dob && result.confidence === 0) {
    // Check if response mentions search results
    if (text.toLowerCase().includes('linkedin') || text.toLowerCase().includes('profile')) {
      result.confidence = 70;
    } else if (text.toLowerCase().includes('graduation') || text.toLowerCase().includes('education')) {
      result.confidence = 65;
    } else if (text.toLowerCase().includes('heuristic') || text.toLowerCase().includes('estimate')) {
      result.confidence = 40;
    } else {
      result.confidence = 50;
    }
    console.log(`📊 Auto-set confidence to ${result.confidence}% based on context`);
  }
  
  return result;
};

// Infer DOB using Vertex AI + Google Search (Enhanced Prompt v2)
const inferDob = async (params: DobInferenceRequest): Promise<DobInferenceResult> => {
  const { name, email, address, residenceCountry, phone } = params;
  
  // Build location string
  const locationParts: string[] = [];
  if (address?.city) locationParts.push(address.city);
  if (address?.state) locationParts.push(address.state);
  if (address?.country) locationParts.push(address.country);
  else if (residenceCountry) locationParts.push(residenceCountry);
  
  const location = locationParts.join(', ') || 'Unknown';

  const prompt = `
# DOB DISCOVERY MISSION - DIGITAL FOOTPRINT ANALYSIS

You are an expert OSINT researcher. Your ONLY task is to find the Date of Birth (DOB) for this person.

## TARGET PERSON
- **Name**: "${name}"
- **Location**: ${location}
- **Email**: ${email || 'Not provided'}
- **Phone**: ${phone || 'Not provided'}

---

### PHASE 1: DIGITAL FOOTPRINT & DOB DISCOVERY (CRITICAL)

You must SEARCH for the User's Date of Birth (DOB) or Age using Google Search based on their Name, Email, and Location.

**SEARCH STRATEGY:**

1. **EMAIL DEEP SEARCH**: Perform a deep search for the email: "${email || 'N/A'}". Look for linked profiles:
   - LinkedIn profiles
   - Facebook profiles  
   - Resume/CV on job sites
   - GitHub profiles
   - Personal websites

2. **NAME + LOCATION SEARCH**: Search for "${name}" + "${location}" + "LinkedIn" or "Education" or "Birthday"

3. **⚠️ EMAIL WARNING**: The email address might contain random numbers (e.g., 'ankit97593'). 
   **DO NOT** assume '97' means 1997 unless you find an actual profile or date confirming it. 
   Random large numbers (like 97593) are often just unique identifiers, NOT birth years.

4. **AGE ESTIMATION HEURISTICS (If exact DOB not found):**
   
   **FOR INDIA (Pune, Bangalore, Delhi, Mumbai, etc.):**
   - If the user appears to be a **Student, Fresher, or recent graduate** in Pune, India:
     → Likely birth year is **2000-2004** (Gen Z, currently 22-26 years old)
   - If appears to be a **Working Professional (3-8 years exp)** in Indian tech:
     → Likely birth year is **1993-2000** (currently 26-33 years old)
   - If appears to be a **Senior Professional/Manager**:
     → Likely birth year is **1985-1993** (currently 33-41 years old)
   
   **Do NOT default to Millennials (1990s) if context suggests younger professional or student.**
   
   **Look for these clues:**
   - "Class of 202X" → Calculate: 202X - 22 = birth year
   - "Graduated 202X" → Calculate: 202X - 22 = birth year
   - "X years of experience" → Calculate: 2026 - X - 22 = approximate birth year
   - College admission year → Add 18 to get birth year

5. **NAME POPULARITY CURVES (Last Resort):**
   
   | Indian Names | Peak Years | Current Age (2026) |
   |-------------|------------|-------------------|
   | Aarav, Advait, Ananya | 2010-2020 | 6-16 years |
   | Aryan, Riya, Ishaan | 2000-2010 | 16-26 years |
   | Ankit, Amit, Priya, Pooja | 1985-1995 | 31-41 years |
   | Rahul, Arun, Sanjay, Suresh | 1970-1985 | 41-56 years |

---

### OUTPUT FORMAT (STRICT JSON-LIKE)

Respond with EXACTLY this format:

DOB: YYYY-MM-DD
CONFIDENCE: [0-100]
METHOD: [Search / Graduation Year / Experience Calculation / Heuristic / Name Curve]
SOURCES: [comma-separated list of sources or signals used]
REASONING: [1-2 sentence explanation of how you determined the DOB]

**CONFIDENCE LEVELS:**
- 90-100: Found exact DOB from public profile
- 70-89: Found graduation year or specific age mention
- 50-69: Calculated from experience/education timeline
- 30-49: Estimated from name popularity + location context
- 0-29: Pure guess, insufficient data

**EXAMPLE OUTPUT:**
DOB: 2001-06-15
CONFIDENCE: 72
METHOD: Graduation Year
SOURCES: LinkedIn Education section shows B.Tech 2023
REASONING: Found graduation year 2023, assuming typical age 22 at graduation, birth year would be around 2001. Used June 15 as default day/month.

---

Now search for "${name}" with email "${email || 'not provided'}" in "${location}" and find their DOB:
`;

  try {
    const response = await callVertexAI(prompt);
    
    let text = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      text = response.candidates[0].content.parts
        .map((part: any) => part.text || "")
        .join("");
    }
    
    console.log(`📋 Gemini response for DOB:`, text.substring(0, 500));
    
    const result = parseDobResponse(text);
    
    // Add grounding sources if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          result.sources.push(chunk.web.uri);
        }
      });
    }
    
    return result;
    
  } catch (error) {
    console.error("DOB inference error:", error);
    
    // Fallback: Use onomastic estimation based on first name
    const firstName = name.split(' ')[0].toLowerCase();
    
    // Indian names born 1985-1995
    const indianMillennial = ['ankit', 'amit', 'priya', 'pooja', 'neha', 'rahul', 'vikas', 'deepak'];
    
    // Western millennial names
    const westernMillennial = ['joshua', 'jessica', 'ashley', 'brittany', 'tyler', 'brandon'];
    
    let estimatedYear = 1990;
    let confidence = 25;
    
    if (indianMillennial.includes(firstName)) {
      estimatedYear = 1990;
      confidence = 35;
    } else if (westernMillennial.includes(firstName)) {
      estimatedYear = 1992;
      confidence = 35;
    }
    
    return {
      dob: `${estimatedYear}-06-15`,
      dobDisplay: `06/15/${estimatedYear}`,
      age: 2026 - estimatedYear,
      confidence,
      sources: ['Name popularity analysis (fallback)'],
      reasoning: `Estimated based on first name "${firstName}" popularity patterns. Low confidence due to search failure.`
    };
  }
};

// HTTP Handler
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

    const body: DobInferenceRequest = await req.json();
    
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🎂 DOB Inference request for: ${body.name}`);
    
    const result = await inferDob(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("API Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
