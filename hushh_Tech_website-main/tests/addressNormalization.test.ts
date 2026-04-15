import { describe, expect, it } from 'vitest';

import {
  buildOnboardingAddressRepairPatch,
  normalizeDetectedAddress,
} from '../src/services/location/addressNormalization.js';
import type { LocationData } from '../src/services/location/types';

const mahalungeAddress = {
  country: 'India',
  countryCode: 'IN',
  state: 'Maharashtra',
  stateCode: 'MH',
  city: 'Pune',
  postalCode: '411045',
  phoneDialCode: '+91',
  timezone: 'Asia/Kolkata',
  formattedAddress: '1, Tower-3, Godrej Hillside, Mahalunge, Pune, Maharashtra 411045, India',
  latitude: 18.5943,
  longitude: 73.7537,
} satisfies LocationData;

const seattleAddress = {
  country: 'United States',
  countryCode: 'US',
  state: 'Washington',
  stateCode: 'WA',
  city: 'Seattle',
  postalCode: '98109',
  phoneDialCode: '+1',
  timezone: 'America/Los_Angeles',
  formattedAddress: '500 Terry Ave N, Seattle, Washington 98109, United States',
  latitude: 47.6221,
  longitude: -122.3378,
} satisfies LocationData;

describe('address normalization', () => {
  it('keeps the full street/building/locality prefix in address line 1', () => {
    const normalized = normalizeDetectedAddress(mahalungeAddress, 'India');

    expect(normalized.addressLine1).toBe('1, Tower-3, Godrej Hillside, Mahalunge');
    expect(normalized.addressLine2).toBe('Pune, Maharashtra');
    expect(normalized.city).toBe('Pune');
    expect(normalized.state).toBe('Maharashtra');
    expect(normalized.zipCode).toBe('411045');
    expect(normalized.country).toBe('India');
  });

  it('builds address line 2 from live GPS locality fields instead of a fixed literal', () => {
    const normalized = normalizeDetectedAddress(seattleAddress, 'United States');

    expect(normalized.addressLine1).toBe('500 Terry Ave N');
    expect(normalized.addressLine2).toBe('Seattle, Washington');
    expect(normalized.city).toBe('Seattle');
    expect(normalized.state).toBe('Washington');
    expect(normalized.zipCode).toBe('98109');
  });

  it('falls back to the formatted GPS address when the structured city is missing', () => {
    const normalized = normalizeDetectedAddress({
      ...mahalungeAddress,
      city: '',
    }, 'India');

    expect(normalized.addressLine1).toBe('1, Tower-3, Godrej Hillside, Mahalunge');
    expect(normalized.addressLine2).toBe('Pune, Maharashtra');
    expect(normalized.city).toBe('Pune');
    expect(normalized.state).toBe('Maharashtra');
  });

  it('falls back to the formatted GPS address when the structured state is missing', () => {
    const normalized = normalizeDetectedAddress({
      ...mahalungeAddress,
      state: '',
      stateCode: '',
    }, 'India');

    expect(normalized.addressLine1).toBe('1, Tower-3, Godrej Hillside, Mahalunge');
    expect(normalized.addressLine2).toBe('Pune, Maharashtra');
    expect(normalized.city).toBe('Pune');
    expect(normalized.state).toBe('Maharashtra');
  });

  it('builds a repair patch for truncated line 1 and auto-filled city/state line 2', () => {
    const patch = buildOnboardingAddressRepairPatch({
      address_line_1: '1',
      address_line_2: '',
      city: null,
      state: null,
      zip_code: null,
      address_country: null,
      gps_full_address: mahalungeAddress.formattedAddress,
      gps_city: 'Pune',
      gps_state: 'Maharashtra',
      gps_country: 'India',
      gps_zip_code: '411045',
    });

    expect(patch).toEqual({
      address_line_1: '1, Tower-3, Godrej Hillside, Mahalunge',
      address_line_2: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      zip_code: '411045',
      address_country: 'India',
    });
  });
});
