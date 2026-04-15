// hushh-location-geocode - Edge Function for GPS-based reverse geocoding
// Uses Google Geocoding API (if configured) to convert lat/lng to full address components.
// Falls back to OpenStreetMap Nominatim when Google is not configured or fails.

import { corsHeaders } from '../_shared/cors.ts';

// Country code to phone dial code mapping
const COUNTRY_DIAL_CODES: Record<string, string> = {
  'US': '+1',
  'CA': '+1',
  'GB': '+44',
  'UK': '+44',
  'IN': '+91',
  'CN': '+86',
  'JP': '+81',
  'AU': '+61',
  'DE': '+49',
  'FR': '+33',
  'IT': '+39',
  'ES': '+34',
  'BR': '+55',
  'MX': '+52',
  'RU': '+7',
  'KR': '+82',
  'SA': '+966',
  'AE': '+971',
  'SG': '+65',
  'HK': '+852',
  'NZ': '+64',
  'ZA': '+27',
  'EG': '+20',
  'NG': '+234',
  'PK': '+92',
  'BD': '+880',
  'ID': '+62',
  'MY': '+60',
  'TH': '+66',
  'VN': '+84',
  'PH': '+63',
  'TR': '+90',
  'PL': '+48',
  'NL': '+31',
  'BE': '+32',
  'SE': '+46',
  'NO': '+47',
  'DK': '+45',
  'FI': '+358',
  'CH': '+41',
  'AT': '+43',
  'PT': '+351',
  'GR': '+30',
  'IE': '+353',
  'IL': '+972',
  'AR': '+54',
  'CL': '+56',
  'CO': '+57',
  'PE': '+51',
  'VE': '+58',
};

// Country code to timezone mapping (simplified - uses capital city timezone)
const COUNTRY_TIMEZONES: Record<string, string> = {
  'US': 'America/New_York',
  'CA': 'America/Toronto',
  'GB': 'Europe/London',
  'UK': 'Europe/London',
  'IN': 'Asia/Kolkata',
  'CN': 'Asia/Shanghai',
  'JP': 'Asia/Tokyo',
  'AU': 'Australia/Sydney',
  'DE': 'Europe/Berlin',
  'FR': 'Europe/Paris',
  'AE': 'Asia/Dubai',
  'SG': 'Asia/Singapore',
  'SA': 'Asia/Riyadh',
};

const NOMINATIM_REVERSE_API = 'https://nominatim.openstreetmap.org/reverse';

interface GeocodingResult {
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  postalCode: string;
  phoneDialCode: string;
  timezone: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

const getDialCodeForCountry = (countryCode: string): string => {
  const code = (countryCode || '').toUpperCase();
  return COUNTRY_DIAL_CODES[code] || '+1';
};

const getTimezoneForCountry = (countryCode: string): string => {
  const code = (countryCode || '').toUpperCase();
  return COUNTRY_TIMEZONES[code] || 'UTC';
};

const parseIsoSubdivisionCode = (value: unknown): string => {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str) return '';
  const last = str.includes('-') ? str.split('-').pop() : str;
  return (last || '').toUpperCase();
};

const reverseGeocodeViaGoogle = async (
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<GeocodingResult> => {
  // Call Google Geocoding API
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

  console.log(`[hushh-location-geocode] Reverse geocoding via Google: ${latitude}, ${longitude}`);

  const response = await fetch(geocodeUrl);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`Google geocoding failed: ${data.status || 'Unknown status'}`);
  }

  // Parse address components from Google response
  const result = data.results[0];
  const components = result.address_components || [];

  let country = '';
  let countryCode = '';
  let state = '';
  let stateCode = '';
  let city = '';
  let postalCode = '';

  for (const component of components) {
    const types = component.types || [];

    if (types.includes('country')) {
      country = component.long_name;
      countryCode = component.short_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.long_name;
      stateCode = component.short_name;
    } else if (types.includes('locality')) {
      city = component.long_name;
    } else if (types.includes('sublocality_level_1') && !city) {
      city = component.long_name;
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name;
    }
  }

  const phoneDialCode = getDialCodeForCountry(countryCode);
  const timezone = getTimezoneForCountry(countryCode);

  return {
    country,
    countryCode,
    state,
    stateCode,
    city,
    postalCode,
    phoneDialCode,
    timezone,
    formattedAddress: result.formatted_address || '',
    latitude,
    longitude,
  };
};

const reverseGeocodeViaNominatim = async (
  req: Request,
  latitude: number,
  longitude: number
): Promise<GeocodingResult> => {
  const url =
    `${NOMINATIM_REVERSE_API}?format=jsonv2&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}&addressdetails=1`;

  const userAgent =
    Deno.env.get('NOMINATIM_USER_AGENT') || 'hushh-location-geocode/1.0 (https://hushh.ai)';

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Accept-Language': 'en',
    // Nominatim requires an identifiable User-Agent.
    'User-Agent': userAgent,
  };

  // Some providers log/expect a Referer; use Origin when available.
  const origin = req.headers.get('origin');
  if (origin) headers['Referer'] = origin;

  console.log(`[hushh-location-geocode] Reverse geocoding via Nominatim: ${latitude}, ${longitude}`);

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed: ${response.status}`);
  }

  const json = await response.json() as any;
  const addr = json?.address || {};

  const countryCode = String(addr?.country_code || '').toUpperCase();

  const stateIso =
    addr?.['ISO3166-2-lvl4'] ||
    addr?.['ISO3166-2-lvl6'] ||
    addr?.['ISO3166-2-lvl3'] ||
    addr?.['ISO3166-2-lvl5'] ||
    '';

  const stateCode = parseIsoSubdivisionCode(stateIso || addr?.state_code || '');

  const city =
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.hamlet ||
    addr?.suburb ||
    addr?.county ||
    addr?.state_district ||
    '';

  const phoneDialCode = getDialCodeForCountry(countryCode);
  const timezone = getTimezoneForCountry(countryCode);

  return {
    country: String(addr?.country || ''),
    countryCode,
    state: String(addr?.state || addr?.region || ''),
    stateCode,
    city: String(city || ''),
    postalCode: String(addr?.postcode || ''),
    phoneDialCode,
    timezone,
    formattedAddress: String(json?.display_name || ''),
    latitude,
    longitude,
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (latitude == null || longitude == null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing latitude or longitude' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const latNum = typeof latitude === 'number' ? latitude : Number(latitude);
    const lonNum = typeof longitude === 'number' ? longitude : Number(longitude);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid latitude or longitude',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prefer Google (if configured), but always fall back to Nominatim for robustness.
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    let locationData: GeocodingResult | null = null;
    let lastError: unknown = null;

    if (apiKey) {
      try {
        locationData = await reverseGeocodeViaGoogle(latNum, lonNum, apiKey);
      } catch (err) {
        lastError = err;
        console.warn('[hushh-location-geocode] Google geocoding failed, falling back to Nominatim:', err);
      }
    } else {
      console.log('[hushh-location-geocode] GOOGLE_MAPS_API_KEY not set, using Nominatim fallback');
    }

    if (!locationData) {
      try {
        locationData = await reverseGeocodeViaNominatim(req, latNum, lonNum);
      } catch (err) {
        lastError = err;
      }
    }

    if (!locationData) {
      const msg = lastError instanceof Error ? lastError.message : 'Geocoding failed';
      console.error('[hushh-location-geocode] All providers failed:', lastError);
      return new Response(
        JSON.stringify({
          success: false,
          error: msg,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[hushh-location-geocode] Success:', JSON.stringify(locationData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: locationData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[hushh-location-geocode] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
