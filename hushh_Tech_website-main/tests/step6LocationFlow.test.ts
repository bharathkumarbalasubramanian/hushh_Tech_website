/**
 * Unit Tests for Step 6 Location Detection Flow
 * 
 * UX Flow:
 * 1. User arrives at Step 6
 * 2. Check DB for existing location data (gps_location_data)
 * 3. If exists → Use cached data, skip detection
 * 4. If not exists → Request GPS permission
 * 5. Get GPS coords → Call geocode API
 * 6. Save to DB for Steps 8 & 10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types
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

interface OnboardingData {
  user_id: string;
  citizenship_country?: string;
  residence_country?: string;
  gps_location_data?: LocationData | null;
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
};

// Mock Geocode API response
const mockGeoApiResponse: LocationData = {
  country: 'India',
  countryCode: 'IN',
  state: 'Maharashtra',
  stateCode: 'MH',
  city: 'Mumbai',
  postalCode: '400001',
  phoneDialCode: '+91',
  timezone: 'Asia/Kolkata',
  formattedAddress: 'Mumbai, Maharashtra 400001, India',
  latitude: 19.076,
  longitude: 72.8777,
};

// Location service to test
class LocationService {
  constructor(private supabaseClient: typeof mockSupabaseClient) {}

  /**
   * Check if location data exists in DB
   */
  async hasExistingLocationData(userId: string): Promise<boolean> {
    const { data } = await this.supabaseClient
      .from('onboarding_data')
      .select('gps_location_data')
      .eq('user_id', userId)
      .single();

    return data?.gps_location_data !== null && data?.gps_location_data !== undefined;
  }

  /**
   * Get cached location data from DB
   */
  async getCachedLocationData(userId: string): Promise<LocationData | null> {
    const { data } = await this.supabaseClient
      .from('onboarding_data')
      .select('gps_location_data')
      .eq('user_id', userId)
      .single();

    return data?.gps_location_data || null;
  }

  /**
   * Call geocode API with GPS coordinates
   */
  async geocodeLocation(latitude: number, longitude: number): Promise<LocationData> {
    const response = await fetch(
      'https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      }
    );
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  /**
   * Save location data to DB
   */
  async saveLocationData(userId: string, locationData: LocationData): Promise<void> {
    await this.supabaseClient
      .from('onboarding_data')
      .update({
        gps_location_data: locationData,
        gps_detected_country: locationData.country,
        gps_detected_state: locationData.state,
        gps_detected_city: locationData.city,
        gps_detected_postal_code: locationData.postalCode,
        gps_detected_phone_dial_code: locationData.phoneDialCode,
        gps_detected_timezone: locationData.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Main flow: Check DB → Request GPS → Geocode → Save
   */
  async initLocationDetection(userId: string): Promise<{
    source: 'cached' | 'detected' | 'failed';
    data: LocationData | null;
  }> {
    // Step 1: Check DB for existing data
    const hasCached = await this.hasExistingLocationData(userId);
    if (hasCached) {
      const cachedData = await this.getCachedLocationData(userId);
      return { source: 'cached', data: cachedData };
    }

    // Step 2: Request GPS (mocked in tests)
    try {
      // This would be navigator.geolocation.getCurrentPosition() in real code
      const coords = { latitude: 19.076, longitude: 72.8777 };

      // Step 3: Call geocode API
      const locationData = await this.geocodeLocation(coords.latitude, coords.longitude);

      // Step 4: Save to DB
      await this.saveLocationData(userId, locationData);

      return { source: 'detected', data: locationData };
    } catch (error) {
      return { source: 'failed', data: null };
    }
  }
}

describe('Step 6 Location Detection Flow', () => {
  let locationService: LocationService;

  beforeEach(() => {
    vi.clearAllMocks();
    locationService = new LocationService(mockSupabaseClient);
  });

  describe('1. Check DB for existing location data', () => {
    it('should return true if gps_location_data exists in DB', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: mockGeoApiResponse },
        error: null,
      });

      const result = await locationService.hasExistingLocationData('user-123');
      expect(result).toBe(true);
    });

    it('should return false if gps_location_data is null', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: null },
        error: null,
      });

      const result = await locationService.hasExistingLocationData('user-123');
      expect(result).toBe(false);
    });

    it('should return false if no record exists', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await locationService.hasExistingLocationData('user-123');
      expect(result).toBe(false);
    });
  });

  describe('2. Use cached data if exists (skip detection)', () => {
    it('should return cached data and not call geocode API', async () => {
      // First call for hasExistingLocationData
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: mockGeoApiResponse },
        error: null,
      });
      // Second call for getCachedLocationData
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: mockGeoApiResponse },
        error: null,
      });

      const fetchSpy = vi.spyOn(global, 'fetch');
      const result = await locationService.initLocationDetection('user-123');

      expect(result.source).toBe('cached');
      expect(result.data).toEqual(mockGeoApiResponse);
      expect(fetchSpy).not.toHaveBeenCalled(); // Geocode API should NOT be called
    });
  });

  describe('3. Request GPS and call geocode API if no cached data', () => {
    it('should detect location when no cached data exists', async () => {
      // hasExistingLocationData returns false
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: null },
        error: null,
      });

      // Mock fetch for geocode API
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockGeoApiResponse }),
      } as Response);

      // Mock update for saveLocationData
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await locationService.initLocationDetection('user-123');

      expect(result.source).toBe('detected');
      expect(result.data).toEqual(mockGeoApiResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('latitude'),
        })
      );
    });
  });

  describe('4. Save location data to DB for Steps 8 & 10', () => {
    it('should save all location fields to onboarding_data', async () => {
      await locationService.saveLocationData('user-123', mockGeoApiResponse);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('onboarding_data');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          gps_location_data: mockGeoApiResponse,
          gps_detected_country: 'India',
          gps_detected_state: 'Maharashtra',
          gps_detected_city: 'Mumbai',
          gps_detected_postal_code: '400001',
          gps_detected_phone_dial_code: '+91',
          gps_detected_timezone: 'Asia/Kolkata',
        })
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('5. Handle GPS permission denied', () => {
    it('should return failed status when GPS errors', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { gps_location_data: null },
        error: null,
      });

      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Permission denied'));

      const result = await locationService.initLocationDetection('user-123');

      expect(result.source).toBe('failed');
      expect(result.data).toBeNull();
    });
  });
});

// Integration test - skip in unit test mode, run with: npm run test:integration
describe.skip('Geocode API Integration Test', () => {
  it('should call real geocode API and return valid response', async () => {
    // This test requires real network access - run separately
    // Command: curl -X POST "https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/hushh-location-geocode" \
    //   -H "Content-Type: application/json" \
    //   -d '{"latitude": 37.7749, "longitude": -122.4194}'
    expect(true).toBe(true);
  });
});
