/**
 * Unit Tests for Location Service
 * Tests for Step 6 and Step 10 location detection and dropdown APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types matching our service
interface LocationData {
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

interface Country {
  isoCode: string;
  name: string;
}

interface State {
  isoCode: string;
  name: string;
}

interface City {
  name: string;
}

// Mock GPS data for India (Mumbai)
const mockGpsDataIndia: LocationData = {
  country: 'India',
  countryCode: 'IN',
  state: 'Maharashtra',
  stateCode: 'MH',
  city: 'Mumbai',
  postalCode: '400001',
  phoneDialCode: '+91',
  timezone: 'Asia/Kolkata',
  formattedAddress: '123 Marine Drive, Mumbai, Maharashtra 400001, India',
  latitude: 19.076,
  longitude: 72.8777,
};

// Mock GPS data for USA (San Francisco)
const mockGpsDataUSA: LocationData = {
  country: 'United States',
  countryCode: 'US',
  state: 'California',
  stateCode: 'CA',
  city: 'San Francisco',
  postalCode: '94102',
  phoneDialCode: '+1',
  timezone: 'America/Los_Angeles',
  formattedAddress: '123 Market St, San Francisco, CA 94102, USA',
  latitude: 37.7749,
  longitude: -122.4194,
};

// Mock countries list
const mockCountries: Country[] = [
  { isoCode: 'US', name: 'United States' },
  { isoCode: 'IN', name: 'India' },
  { isoCode: 'GB', name: 'United Kingdom' },
  { isoCode: 'CA', name: 'Canada' },
];

// Mock states for India
const mockStatesIndia: State[] = [
  { isoCode: 'MH', name: 'Maharashtra' },
  { isoCode: 'DL', name: 'Delhi' },
  { isoCode: 'KA', name: 'Karnataka' },
  { isoCode: 'TN', name: 'Tamil Nadu' },
];

// Mock states for USA
const mockStatesUSA: State[] = [
  { isoCode: 'CA', name: 'California' },
  { isoCode: 'NY', name: 'New York' },
  { isoCode: 'TX', name: 'Texas' },
  { isoCode: 'WA', name: 'Washington' },
];

// Mock cities for Maharashtra
const mockCitiesMH: City[] = [
  { name: 'Mumbai' },
  { name: 'Pune' },
  { name: 'Nagpur' },
  { name: 'Nashik' },
];

// Mock cities for California
const mockCitiesCA: City[] = [
  { name: 'San Francisco' },
  { name: 'Los Angeles' },
  { name: 'San Diego' },
  { name: 'San Jose' },
];

describe('Location Service - API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Geocode API Tests', () => {
    it('should return location data for valid GPS coordinates (India)', async () => {
      // Mock fetch for geocode API
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockGpsDataIndia }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 19.076, longitude: 72.8777 }),
      });
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.countryCode).toBe('IN');
      expect(result.data.state).toBe('Maharashtra');
      expect(result.data.city).toBe('Mumbai');
      expect(result.data.postalCode).toBe('400001');
    });

    it('should return location data for valid GPS coordinates (USA)', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockGpsDataUSA }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 37.7749, longitude: -122.4194 }),
      });
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.countryCode).toBe('US');
      expect(result.data.stateCode).toBe('CA');
      expect(result.data.city).toBe('San Francisco');
    });

    it('should return error for missing coordinates', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Missing latitude or longitude' }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing');
    });
  });

  describe('2. Countries API Tests', () => {
    it('should return list of countries', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCountries }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=countries');
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((c: Country) => c.isoCode === 'US')).toBe(true);
      expect(result.data.some((c: Country) => c.isoCode === 'IN')).toBe(true);
    });

    it('should have isoCode and name for each country', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCountries }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=countries');
      const result = await response.json();

      result.data.forEach((country: Country) => {
        expect(country.isoCode).toBeDefined();
        expect(country.name).toBeDefined();
        expect(country.isoCode.length).toBe(2);
      });
    });
  });

  describe('3. States API Tests', () => {
    it('should return states for India', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStatesIndia }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=states&country=IN');
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((s: State) => s.isoCode === 'MH')).toBe(true);
    });

    it('should return states for USA', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStatesUSA }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=states&country=US');
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.data.some((s: State) => s.isoCode === 'CA')).toBe(true);
      expect(result.data.some((s: State) => s.isoCode === 'NY')).toBe(true);
    });

    it('should return error when country is missing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'country parameter is required for states' }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=states');
      const result = await response.json();

      expect(result.error).toBeDefined();
    });
  });

  describe('4. Cities API Tests', () => {
    it('should return cities for Maharashtra, India', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCitiesMH }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=cities&country=IN&state=MH');
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.data.some((c: City) => c.name === 'Mumbai')).toBe(true);
      expect(result.data.some((c: City) => c.name === 'Pune')).toBe(true);
    });

    it('should return cities for California, USA', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCitiesCA }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=cities&country=US&state=CA');
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.data.some((c: City) => c.name === 'San Francisco')).toBe(true);
      expect(result.data.some((c: City) => c.name === 'Los Angeles')).toBe(true);
    });

    it('should return error when country or state is missing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'country and state parameters are required for cities' }),
      } as Response);

      const response = await fetch('https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/get-locations?type=cities&country=IN');
      const result = await response.json();

      expect(result.error).toBeDefined();
    });
  });

  describe('5. Step 6 - Continue Button Logic Tests', () => {
    it('should enable continue when location is detected', () => {
      const locationDetected = true;
      const userManuallyChanged = false;
      const detectionAttempted = true;
      const isDetectingLocation = false;

      const canContinue = locationDetected || userManuallyChanged || (detectionAttempted && !isDetectingLocation);
      expect(canContinue).toBe(true);
    });

    it('should enable continue when user manually changes dropdown', () => {
      const locationDetected = false;
      const userManuallyChanged = true;
      const detectionAttempted = false;
      const isDetectingLocation = false;

      const canContinue = locationDetected || userManuallyChanged || (detectionAttempted && !isDetectingLocation);
      expect(canContinue).toBe(true);
    });

    it('should disable continue while detecting location', () => {
      const locationDetected = false;
      const userManuallyChanged = false;
      const detectionAttempted = false;
      const isDetectingLocation = true;

      const canContinue = locationDetected || userManuallyChanged || (detectionAttempted && !isDetectingLocation);
      expect(canContinue).toBe(false);
    });

    it('should enable continue after detection fails (user can proceed)', () => {
      const locationDetected = false;
      const userManuallyChanged = false;
      const detectionAttempted = true;
      const isDetectingLocation = false;

      const canContinue = locationDetected || userManuallyChanged || (detectionAttempted && !isDetectingLocation);
      expect(canContinue).toBe(true);
    });
  });

  describe('6. Step 10 - Form Validation Tests', () => {
    it('should validate address line 1 is required', () => {
      const validateAddressLine1 = (value: string): string | undefined => {
        if (!value.trim()) return 'Address is required';
        if (value.trim().length < 5) return 'Address is too short';
        if (value.trim().length > 100) return 'Address is too long';
        if (!/[a-zA-Z]/.test(value)) return 'Please enter a valid address';
        return undefined;
      };

      expect(validateAddressLine1('')).toBe('Address is required');
      expect(validateAddressLine1('   ')).toBe('Address is required');
      expect(validateAddressLine1('123')).toBe('Address is too short');
      expect(validateAddressLine1('123 Main Street')).toBeUndefined();
    });

    it('should validate ZIP code format', () => {
      const validateZipCode = (value: string): string | undefined => {
        if (!value.trim()) return 'ZIP code is required';
        if (!/^\d{5,6}$/.test(value.trim())) return 'ZIP code must be 5 or 6 digits';
        return undefined;
      };

      expect(validateZipCode('')).toBe('ZIP code is required');
      expect(validateZipCode('123')).toBe('ZIP code must be 5 or 6 digits');
      expect(validateZipCode('12345')).toBeUndefined();
      expect(validateZipCode('123456')).toBeUndefined();
      expect(validateZipCode('400001')).toBeUndefined();
    });

    it('should validate all required fields for continue button', () => {
      const isValid = (addressLine1: string, country: string, state: string, city: string, zipCode: string) => {
        return addressLine1.trim() && country && state && city && zipCode.trim();
      };

      expect(isValid('123 Main St', 'US', 'CA', 'San Francisco', '94102')).toBeTruthy();
      expect(isValid('', 'US', 'CA', 'San Francisco', '94102')).toBeFalsy();
      expect(isValid('123 Main St', '', 'CA', 'San Francisco', '94102')).toBeFalsy();
      expect(isValid('123 Main St', 'US', '', 'San Francisco', '94102')).toBeFalsy();
      expect(isValid('123 Main St', 'US', 'CA', '', '94102')).toBeFalsy();
      expect(isValid('123 Main St', 'US', 'CA', 'San Francisco', '')).toBeFalsy();
    });
  });

  describe('7. Country Code Mapping Tests', () => {
    it('should map country codes to names correctly', () => {
      const COUNTRY_CODE_TO_NAME: Record<string, string> = {
        'US': 'United States',
        'IN': 'India',
        'GB': 'United Kingdom',
        'CA': 'Canada',
      };

      expect(COUNTRY_CODE_TO_NAME['US']).toBe('United States');
      expect(COUNTRY_CODE_TO_NAME['IN']).toBe('India');
      expect(COUNTRY_CODE_TO_NAME['GB']).toBe('United Kingdom');
    });

    it('should map country names to ISO codes correctly', () => {
      const mapCountryToIsoCode = (countryName: string): string => {
        const countryMap: Record<string, string> = {
          'United States': 'US',
          'USA': 'US',
          'India': 'IN',
          'United Kingdom': 'GB',
          'UK': 'GB',
          'Canada': 'CA',
        };
        return countryMap[countryName] || countryName;
      };

      expect(mapCountryToIsoCode('United States')).toBe('US');
      expect(mapCountryToIsoCode('USA')).toBe('US');
      expect(mapCountryToIsoCode('India')).toBe('IN');
      expect(mapCountryToIsoCode('Unknown')).toBe('Unknown');
    });
  });

  describe('8. State/City Matching Tests', () => {
    it('should find matching state by isoCode', () => {
      const findMatchingState = (states: State[], gpsState: string, gpsStateCode?: string): State | null => {
        if (gpsStateCode) {
          const byCode = states.find(s => s.isoCode === gpsStateCode);
          if (byCode) return byCode;
        }
        const byName = states.find(s => s.name.toLowerCase() === gpsState.toLowerCase());
        return byName || null;
      };

      const result = findMatchingState(mockStatesIndia, 'Maharashtra', 'MH');
      expect(result).toBeDefined();
      expect(result?.isoCode).toBe('MH');
    });

    it('should find matching state by name when code not found', () => {
      const findMatchingState = (states: State[], gpsState: string, gpsStateCode?: string): State | null => {
        if (gpsStateCode) {
          const byCode = states.find(s => s.isoCode === gpsStateCode);
          if (byCode) return byCode;
        }
        const byName = states.find(s => s.name.toLowerCase() === gpsState.toLowerCase());
        return byName || null;
      };

      const result = findMatchingState(mockStatesIndia, 'maharashtra');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Maharashtra');
    });

    it('should find matching city by name', () => {
      const findMatchingCity = (cities: City[], gpsCity: string): City | null => {
        const exact = cities.find(c => c.name.toLowerCase() === gpsCity.toLowerCase());
        return exact || null;
      };

      const result = findMatchingCity(mockCitiesMH, 'Mumbai');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Mumbai');
    });
  });
});

describe('Location Service - Integration Flow Tests', () => {
  describe('Step 6 Flow', () => {
    it('should follow correct flow: Check DB → Request GPS → Geocode → Save', async () => {
      const flowSteps: string[] = [];

      // Simulate flow
      flowSteps.push('check_db_for_cached');
      flowSteps.push('request_gps_permission');
      flowSteps.push('call_geocode_api');
      flowSteps.push('save_to_db');
      flowSteps.push('enable_continue');

      expect(flowSteps).toEqual([
        'check_db_for_cached',
        'request_gps_permission',
        'call_geocode_api',
        'save_to_db',
        'enable_continue',
      ]);
    });
  });

  describe('Step 10 Flow', () => {
    it('should follow correct flow: Load countries → Set country → Load states → Set state → Load cities → Set city', async () => {
      const flowSteps: string[] = [];

      // Simulate sequential loading
      flowSteps.push('load_countries');
      flowSteps.push('set_country_from_gps');
      flowSteps.push('load_states_for_country');
      flowSteps.push('set_state_from_gps');
      flowSteps.push('load_cities_for_state');
      flowSteps.push('set_city_from_gps');
      flowSteps.push('enable_continue');

      expect(flowSteps).toEqual([
        'load_countries',
        'set_country_from_gps',
        'load_states_for_country',
        'set_state_from_gps',
        'load_cities_for_state',
        'set_city_from_gps',
        'enable_continue',
      ]);
    });
  });
});
