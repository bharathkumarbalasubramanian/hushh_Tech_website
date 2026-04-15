/**
 * Location Service - Public API
 * Export all location-related services and types
 */

export { LocationService, locationService } from './locationService';
export {
  buildOnboardingAddressRepairPatch,
  isClearlyTruncatedAddressLine1,
  looksLikeAutoFilledCityStateLine2,
  normalizeDetectedAddress,
} from './addressNormalization.js';
export * from './cache';
export * from './types';
