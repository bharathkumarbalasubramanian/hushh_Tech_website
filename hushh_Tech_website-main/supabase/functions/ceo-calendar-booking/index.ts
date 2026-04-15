/**
 * CEO Calendar Booking Edge Function
 * 
 * Uses Google Service Account with Domain-Wide Delegation to:
 * - Fetch available time slots from Manish's calendar
 * - Create meeting events when users book
 */

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// CEO Calendar Configuration
const CEO_EMAIL = "manish@hushh.ai";
const CEO_NAME = "Manish Sainani";
const MEETING_DURATION_MINUTES = 60;
const TIMEZONE = "America/Los_Angeles"; // PST

// Working hours (9 AM - 6 PM)
const WORKING_HOURS_START = 9;
const WORKING_HOURS_END = 18;

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

  return `${signatureInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

/**
 * Get an access token for Google Calendar API
 */
async function getCalendarAccessToken(): Promise<string> {
  const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Missing Google Service Account credentials");
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const signedJwt = await createSignedJWT(
    serviceAccountEmail,
    formattedPrivateKey,
    CEO_EMAIL,
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
    console.error("Failed to get calendar access token:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get busy times from calendar using freebusy query
 */
async function getBusyTimes(accessToken: string, startDate: string, endDate: string): Promise<Array<{start: string, end: string}>> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: startDate,
      timeMax: endDate,
      timeZone: TIMEZONE,
      items: [{ id: CEO_EMAIL }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("FreeBusy API error:", error);
    throw new Error(`FreeBusy API error: ${error}`);
  }

  const data = await response.json();
  return data.calendars?.[CEO_EMAIL]?.busy || [];
}

/**
 * Generate available time slots for a given date range
 */
function generateAvailableSlots(
  busyTimes: Array<{start: string, end: string}>,
  startDate: Date,
  numDays: number
): Array<{date: string, slots: Array<{startTime: string, endTime: string, available: boolean}>}> {
  const result: Array<{date: string, slots: Array<{startTime: string, endTime: string, available: boolean}>}> = [];

  for (let d = 0; d < numDays; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d);
    
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue;
    }

    const dateStr = currentDate.toISOString().split('T')[0];
    const slots: Array<{startTime: string, endTime: string, available: boolean}> = [];

    // Generate slots for working hours
    for (let hour = WORKING_HOURS_START; hour < WORKING_HOURS_END; hour++) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + MEETING_DURATION_MINUTES);

      // Check if slot conflicts with any busy time
      const isAvailable = !busyTimes.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return (slotStart < busyEnd && slotEnd > busyStart);
      });

      // Only include future slots
      if (slotStart > new Date()) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: isAvailable,
        });
      }
    }

    if (slots.length > 0) {
      result.push({ date: dateStr, slots });
    }
  }

  return result;
}

/**
 * Create a calendar event for the meeting
 */
async function createMeetingEvent(
  accessToken: string,
  startTime: string,
  endTime: string,
  attendeeEmail: string,
  attendeeName: string
): Promise<{eventId: string, meetLink?: string}> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CEO_EMAIL}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `CEO Office Hours - ${attendeeName}`,
        description: `1-hour deep dive meeting with ${attendeeName} (${attendeeEmail}).\n\nBooked via Hushh Fund A onboarding.`,
        start: {
          dateTime: startTime,
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: endTime,
          timeZone: TIMEZONE,
        },
        attendees: [
          { email: CEO_EMAIL, displayName: CEO_NAME },
          { email: attendeeEmail, displayName: attendeeName },
        ],
        conferenceData: {
          createRequest: {
            requestId: `hushh-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Calendar event creation error:", error);
    throw new Error(`Failed to create event: ${error}`);
  }

  const event = await response.json();
  return {
    eventId: event.id,
    meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // GET - Fetch available slots
    if (req.method === "GET") {
      const numDays = parseInt(url.searchParams.get("days") || "14");
      
      console.log(`Fetching available slots for next ${numDays} days`);

      const accessToken = await getCalendarAccessToken();
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + numDays);

      const busyTimes = await getBusyTimes(
        accessToken,
        startDate.toISOString(),
        endDate.toISOString()
      );

      const availableSlots = generateAvailableSlots(busyTimes, startDate, numDays);

      return new Response(
        JSON.stringify({
          success: true,
          ceo: { name: CEO_NAME, email: CEO_EMAIL },
          timezone: TIMEZONE,
          meetingDuration: MEETING_DURATION_MINUTES,
          availability: availableSlots,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Book a meeting
    if (req.method === "POST") {
      // Authenticate user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { startTime, endTime, attendeeName } = body;

      if (!startTime || !endTime) {
        return new Response(
          JSON.stringify({ error: "Missing startTime or endTime" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Booking meeting for ${user.email} at ${startTime}`);

      const accessToken = await getCalendarAccessToken();

      // Create the calendar event
      const result = await createMeetingEvent(
        accessToken,
        startTime,
        endTime,
        user.email || "",
        attendeeName || user.user_metadata?.full_name || "Hushh User"
      );

      // Update the ceo_meeting_payments table
      await supabase
        .from("ceo_meeting_payments")
        .update({
          calendly_booked: true,
          meeting_event_id: result.eventId,
          meeting_start_time: startTime,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          success: true,
          eventId: result.eventId,
          meetLink: result.meetLink,
          startTime,
          endTime,
          message: `Meeting booked with ${CEO_NAME}. Calendar invite sent to ${user.email}.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
