import { describe, expect, it } from 'vitest';

import {
  buildStep3AutofillPatch,
  buildStep3SavePayload,
  type Step3FormState,
  type Step3ManualOverrides,
} from '../src/pages/onboarding/step-3/logic';
import { resolveStep4CachedDialCode } from '../src/pages/onboarding/step-4/logic';
import type { LocationData } from '../src/services/location/types';

const emptyFormState: Step3FormState = {
  citizenshipCountry: '',
  residenceCountry: '',
  addressLine1: '',
  addressLine2: '',
  zipCode: '',
  city: '',
  state: '',
  addressCountry: '',
};

const noManualOverrides: Step3ManualOverrides = {
  citizenshipCountry: false,
  residenceCountry: false,
  addressLine1: false,
  addressLine2: false,
  zipCode: false,
};

const gpsAddress = {
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

const seattleGpsAddress = {
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

describe('step 3 address logic', () => {
  it('auto-fills the full normalized address instead of collapsing line 1 to the first token', () => {
    const patch = buildStep3AutofillPatch({
      current: emptyFormState,
      manual: noManualOverrides,
      locationData: gpsAddress,
    });

    expect(patch).toMatchObject({
      citizenshipCountry: 'India',
      residenceCountry: 'India',
      addressLine1: '1, Tower-3, Godrej Hillside, Mahalunge',
      addressLine2: 'Pune, Maharashtra',
      zipCode: '411045',
      city: 'Pune',
      state: 'Maharashtra',
      addressCountry: 'India',
    });
  });

  it('derives address line 2 from the detected GPS city/state for other locations too', () => {
    const patch = buildStep3AutofillPatch({
      current: emptyFormState,
      manual: noManualOverrides,
      locationData: seattleGpsAddress,
    });

    expect(patch).toMatchObject({
      citizenshipCountry: 'United States',
      residenceCountry: 'United States',
      addressLine1: '500 Terry Ave N',
      addressLine2: 'Seattle, Washington',
      zipCode: '98109',
      city: 'Seattle',
      state: 'Washington',
      addressCountry: 'United States',
    });
  });

  it('preserves manual address edits while still updating structured GPS fields', () => {
    const patch = buildStep3AutofillPatch({
      current: {
        ...emptyFormState,
        citizenshipCountry: 'Singapore',
        residenceCountry: 'Singapore',
        addressLine1: 'Custom Street',
        addressLine2: 'Suite 900',
        zipCode: '999999',
      },
      manual: {
        citizenshipCountry: true,
        residenceCountry: true,
        addressLine1: true,
        addressLine2: true,
        zipCode: true,
      },
      locationData: gpsAddress,
    });

    expect(patch.citizenshipCountry).toBeUndefined();
    expect(patch.residenceCountry).toBeUndefined();
    expect(patch.addressLine1).toBeUndefined();
    expect(patch.addressLine2).toBeUndefined();
    expect(patch.zipCode).toBeUndefined();
    expect(patch.city).toBe('Pune');
    expect(patch.state).toBe('Maharashtra');
    expect(patch.addressCountry).toBe('India');
  });

  it('writes the normalized onboarding address columns that later screens read', () => {
    const payload = buildStep3SavePayload({
      citizenshipCountry: 'India',
      residenceCountry: 'India',
      addressLine1: '1, Tower-3, Godrej Hillside, Mahalunge',
      addressLine2: 'Pune, Maharashtra',
      zipCode: '411045',
      city: 'Pune',
      state: 'Maharashtra',
      addressCountry: 'India',
      currentStep: 4,
    });

    expect(payload).toEqual({
      citizenship_country: 'India',
      residence_country: 'India',
      current_step: 4,
      address_line_1: '1, Tower-3, Godrej Hillside, Mahalunge',
      address_line_2: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      zip_code: '411045',
      address_country: 'India',
    });
  });
});

describe('step 4 cached dial-code fallback', () => {
  it('resolves dial code from normalized cached location data without legacy GPS blob fields', () => {
    expect(resolveStep4CachedDialCode({
      savedPhoneCode: '',
      cachedLocation: {
        phoneDialCode: '+91',
        countryCode: 'IN',
      },
    })).toEqual({
      dialCode: '+91',
      countryIso: 'IN',
    });
  });
});
