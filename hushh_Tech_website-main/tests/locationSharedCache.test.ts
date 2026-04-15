import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocationCacheRecord, LocationData } from '../src/services/location/types';

import {
  buildLocationSignature,
  getLocationCacheKey,
  readLocationCache,
  writeLocationCache,
} from '../src/services/location/cache';

const createStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
};

const baseLocation = {
  country: 'United States',
  countryCode: 'US',
  state: 'California',
  stateCode: 'CA',
  city: 'San Francisco',
  postalCode: '94105',
  phoneDialCode: '+1',
  timezone: 'America/Los_Angeles',
  formattedAddress: '1 Market St, San Francisco, CA 94105, United States',
  latitude: 37.7749,
  longitude: -122.4194,
} satisfies LocationData;

const baseRecord = {
  data: baseLocation,
  source: 'gps',
  detectedAt: '2026-03-30T10:00:00.000Z',
  lastCheckedAt: '2026-03-30T10:05:00.000Z',
  signature: buildLocationSignature(baseLocation),
} satisfies LocationCacheRecord;

describe('shared location cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
  });

  it('uses localStorage on web and keeps the cache user-scoped', async () => {
    await writeLocationCache('user-a', baseRecord);
    await writeLocationCache('user-b', {
      ...baseRecord,
      data: { ...baseLocation, city: 'Los Angeles' },
      signature: buildLocationSignature({ ...baseLocation, city: 'Los Angeles' }),
    });

    expect(globalThis.localStorage.setItem).toHaveBeenCalledTimes(2);
    expect(getLocationCacheKey('user-a')).not.toBe(getLocationCacheKey('user-b'));

    const cached = await readLocationCache('user-a');
    expect(cached?.data.city).toBe('San Francisco');
  });

  it('returns null when localStorage is unavailable', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });

    await writeLocationCache('user-a', baseRecord);
    const cached = await readLocationCache('user-a');

    expect(cached).toBeNull();
  });

  it('ignores minor GPS jitter in the location signature but detects real changes', () => {
    const jittered = buildLocationSignature({
      ...baseLocation,
      latitude: 37.77491,
      longitude: -122.41939,
    });
    const changed = buildLocationSignature({
      ...baseLocation,
      city: 'Oakland',
      postalCode: '94607',
    });

    expect(jittered).toBe(baseRecord.signature);
    expect(changed).not.toBe(baseRecord.signature);
  });
});
