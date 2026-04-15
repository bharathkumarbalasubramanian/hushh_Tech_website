import type { LocationData } from './types';

export interface NormalizedDetectedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formattedAddress: string;
}

export interface OnboardingAddressBackfillRow {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  address_country?: string | null;
  gps_full_address?: string | null;
  gps_city?: string | null;
  gps_state?: string | null;
  gps_country?: string | null;
  gps_zip_code?: string | null;
}

export interface OnboardingAddressRepairPatch {
  address_line_1?: string;
  address_line_2?: string | null;
  city?: string;
  state?: string;
  zip_code?: string;
  address_country?: string;
}

export function normalizeDetectedAddress(
  locationData: Partial<LocationData>,
  countryNameOverride?: string
): NormalizedDetectedAddress;

export function looksLikeAutoFilledCityStateLine2(
  line2: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined
): boolean;

export function isClearlyTruncatedAddressLine1(
  currentLine1: string | null | undefined,
  normalizedAddressLine1: string | null | undefined
): boolean;

export function buildOnboardingAddressRepairPatch(
  row: OnboardingAddressBackfillRow
): OnboardingAddressRepairPatch | null;
