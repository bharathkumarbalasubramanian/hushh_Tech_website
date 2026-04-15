/**
 * Step 3 — Combined Country/Residence + Address Entry
 *
 * Merges old step-3 (country detection) and old step-6 (address entry).
 * GPS fires ONCE and auto-fills: citizenship, residence, address line, zip.
 * Country/State/City are stored via GPS columns (gps_country, gps_state, gps_city)
 * — no manual dropdowns needed.
 *
 * Flow: step-2 → step-3 → step-4
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { TOTAL_VISIBLE_ONBOARDING_STEPS } from '../../../services/onboarding/flow';
import { resolveOnboardingPrefill } from '../../../services/onboarding/prefill';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../../utils/useFooterVisibility';
import {
  locationService,
  type LocationCacheRecord,
  type LocationData,
  COUNTRY_CODE_TO_NAME,
  isClearlyTruncatedAddressLine1,
  looksLikeAutoFilledCityStateLine2,
  normalizeDetectedAddress,
} from '../../../services/location';

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

export const CURRENT_STEP = 4; // raw Supabase current_step value
export const TOTAL_STEPS = TOTAL_VISIBLE_ONBOARDING_STEPS;
export const PROGRESS_PCT = Math.round((3 / TOTAL_STEPS) * 100); // display step = 3

// Country list for citizenship/residence dropdowns
export const countries = [
  'United States','Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
  'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso',
  'Burundi','Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China',
  'Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti',
  'Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea',
  'Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece',
  'Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kiribati','North Korea','South Korea','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives',
  'Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','Norway','Oman','Pakistan','Palau','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  'Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo',
  'Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe',
];

export type LocationStatus = 'detecting' | 'success' | 'ip-success' | 'denied' | 'failed' | 'manual' | null;

export interface Step3AddressFields {
  addressLine1: string;
  addressLine2: string;
  zipCode: string;
  city: string;
  state: string;
  addressCountry: string;
}

export interface Step3FormState extends Step3AddressFields {
  citizenshipCountry: string;
  residenceCountry: string;
}

export interface Step3ManualOverrides {
  citizenshipCountry: boolean;
  residenceCountry: boolean;
  addressLine1: boolean;
  addressLine2: boolean;
  zipCode: boolean;
}

/* ═══════════════════════════════════════════════
   ADDRESS VALIDATION
   ═══════════════════════════════════════════════ */

export const validateAddress = (v: string) => {
  if (!v.trim()) return 'Address is required';
  if (v.trim().length < 5) return 'Address is too short';
  if (v.trim().length > 100) return 'Address is too long';
  if (!/[a-zA-Z]/.test(v)) return 'Please enter a valid address';
  return undefined;
};

export const validateRequired = (v: string, label: string) =>
  !v ? `Please select a ${label}` : undefined;

export const validateZip = (v: string) => {
  if (!v.trim()) return 'ZIP / postal code is required';
  if (v.trim().length < 3 || v.trim().length > 10) return 'Enter a valid postal code';
  return undefined;
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

export const getTrustedStep4Countries = (onboardingData: {
  citizenship_country?: string | null;
  residence_country?: string | null;
  current_step?: number | null;
} | null | undefined): {
  citizenship_country?: string;
  residence_country?: string;
} => {
  if (!onboardingData) return {};
  const currentStep =
    typeof onboardingData.current_step === 'number'
      ? onboardingData.current_step
      : Number(onboardingData.current_step || 0);
  if (!Number.isFinite(currentStep) || currentStep < 4) return {};
  return {
    citizenship_country: onboardingData.citizenship_country || undefined,
    residence_country: onboardingData.residence_country || undefined,
  };
};

const getStatusFromCacheRecord = (
  cacheRecord: LocationCacheRecord | null
): LocationStatus => {
  if (!cacheRecord) return null;
  return cacheRecord.source === 'gps' ? 'success' : 'ip-success';
};

/** Check browser geolocation permission state without triggering the prompt. */
const checkGeoPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch {
    // Permissions API not supported
  }
  return 'prompt';
};

export const resolveDetectedLocationForStep3 = (
  locationData: LocationData,
  availableCountries: string[] = countries
) => {
  const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;
  const matchedCountry = availableCountries.includes(countryName) ? countryName : '';
  const normalizedAddress = normalizeDetectedAddress(locationData, countryName);

  return {
    matchedCountry,
    normalizedAddress: {
      addressLine1: normalizedAddress.addressLine1,
      addressLine2: normalizedAddress.addressLine2,
      zipCode: normalizedAddress.zipCode,
      city: normalizedAddress.city,
      state: normalizedAddress.state,
      addressCountry: normalizedAddress.country,
    } satisfies Step3AddressFields,
    detectedLocation:
      locationData.formattedAddress || locationData.city || locationData.state || countryName,
  };
};

export const buildStep3AutofillPatch = ({
  current,
  manual,
  locationData,
  availableCountries = countries,
}: {
  current: Step3FormState;
  manual: Step3ManualOverrides;
  locationData: LocationData;
  availableCountries?: string[];
}): Partial<Step3FormState> => {
  const { matchedCountry, normalizedAddress } = resolveDetectedLocationForStep3(
    locationData,
    availableCountries
  );
  const patch: Partial<Step3FormState> = {};

  if (!manual.citizenshipCountry && matchedCountry && current.citizenshipCountry !== matchedCountry) {
    patch.citizenshipCountry = matchedCountry;
  }

  if (!manual.residenceCountry && matchedCountry && current.residenceCountry !== matchedCountry) {
    patch.residenceCountry = matchedCountry;
  }

  if (
    !manual.addressLine1 &&
    normalizedAddress.addressLine1 &&
    current.addressLine1 !== normalizedAddress.addressLine1
  ) {
    patch.addressLine1 = normalizedAddress.addressLine1;
  }

  if (!manual.addressLine2 && current.addressLine2 !== normalizedAddress.addressLine2) {
    patch.addressLine2 = normalizedAddress.addressLine2;
  }

  if (!manual.zipCode && normalizedAddress.zipCode && current.zipCode !== normalizedAddress.zipCode) {
    patch.zipCode = normalizedAddress.zipCode;
  }

  if (normalizedAddress.city && current.city !== normalizedAddress.city) {
    patch.city = normalizedAddress.city;
  }

  if (normalizedAddress.state && current.state !== normalizedAddress.state) {
    patch.state = normalizedAddress.state;
  }

  if (normalizedAddress.addressCountry && current.addressCountry !== normalizedAddress.addressCountry) {
    patch.addressCountry = normalizedAddress.addressCountry;
  }

  return patch;
};

export const buildStep3SavePayload = ({
  citizenshipCountry,
  residenceCountry,
  addressLine1,
  addressLine2,
  zipCode,
  city,
  state,
  addressCountry,
  currentStep = 4,
}: Step3FormState & { currentStep?: number }): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    citizenship_country: citizenshipCountry,
    residence_country: residenceCountry,
    current_step: currentStep,
  };

  const hasAddressContext = Boolean(
    addressLine1.trim() ||
    addressLine2.trim() ||
    zipCode.trim() ||
    city.trim() ||
    state.trim() ||
    addressCountry.trim()
  );

  if (addressLine1.trim()) payload.address_line_1 = addressLine1.trim();
  if (zipCode.trim()) payload.zip_code = zipCode.trim();
  if (city.trim()) payload.city = city.trim();
  if (state.trim()) payload.state = state.trim();
  if (addressCountry.trim()) payload.address_country = addressCountry.trim();
  if (hasAddressContext) payload.address_line_2 = addressLine2.trim() || null;

  return payload;
};

/* ═══════════════════════════════════════════════
   COMBINED HOOK
   ═══════════════════════════════════════════════ */

export function useCombinedLocationLogic() {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();
  const autoDetectionStartedRef = useRef(false);
  const citizenshipCountryRef = useRef('');
  const residenceCountryRef = useRef('');
  const manualOverridesRef = useRef<Step3ManualOverrides>({
    citizenshipCountry: false,
    residenceCountry: false,
    addressLine1: false,
    addressLine2: false,
    zipCode: false,
  });
  const formStateRef = useRef<Step3FormState>({
    citizenshipCountry: '',
    residenceCountry: '',
    addressLine1: '',
    addressLine2: '',
    zipCode: '',
    city: '',
    state: '',
    addressCountry: '',
  });

  // ─── Auth ───
  const [userId, setUserId] = useState<string | null>(null);

  // ─── Country/Residence fields ───
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');

  // ─── Address fields ───
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressCountry, setAddressCountry] = useState('');

  // ─── Location detection state ───
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(null);
  const [detectedLocation, setDetectedLocation] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // ─── Auto-fill status (simple — no cascade needed) ───
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);

  // ─── Validation state ───
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // ─── Derived state ───
  const canContinue = Boolean(citizenshipCountry && residenceCountry);
  const isErrorStatus = locationStatus === 'denied' || locationStatus === 'failed';
  const isSuccessStatus = locationStatus === 'success' || locationStatus === 'ip-success';

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.classList.add('onboarding-page-scroll');
    document.body.classList.add('onboarding-page-scroll');
    return () => {
      document.documentElement.classList.remove('onboarding-page-scroll');
      document.body.classList.remove('onboarding-page-scroll');
    };
  }, []);

  // Keep refs in sync
  useEffect(() => { citizenshipCountryRef.current = citizenshipCountry; }, [citizenshipCountry]);
  useEffect(() => { residenceCountryRef.current = residenceCountry; }, [residenceCountry]);
  useEffect(() => {
    formStateRef.current = {
      citizenshipCountry,
      residenceCountry,
      addressLine1,
      addressLine2,
      zipCode,
      city: addressCity,
      state: addressState,
      addressCountry,
    };
  }, [
    citizenshipCountry,
    residenceCountry,
    addressLine1,
    addressLine2,
    zipCode,
    addressCity,
    addressState,
    addressCountry,
  ]);

  /* ─── Apply GPS result to fields (country + address + zip) ─── */
  const applyDetectedLocation = (locationData: LocationData, status: LocationStatus) => {
    const { detectedLocation: nextDetectedLocation } = resolveDetectedLocationForStep3(
      locationData,
      countries
    );
    const patch = buildStep3AutofillPatch({
      current: formStateRef.current,
      manual: manualOverridesRef.current,
      locationData,
      availableCountries: countries,
    });

    if (patch.citizenshipCountry !== undefined) {
      citizenshipCountryRef.current = patch.citizenshipCountry;
      setCitizenshipCountry(patch.citizenshipCountry);
    }

    if (patch.residenceCountry !== undefined) {
      residenceCountryRef.current = patch.residenceCountry;
      setResidenceCountry(patch.residenceCountry);
    }

    if (patch.addressLine1 !== undefined) {
      setAddressLine1(patch.addressLine1);
    }

    if (patch.addressLine2 !== undefined) {
      setAddressLine2(patch.addressLine2);
    }

    if (patch.zipCode !== undefined) {
      setZipCode(patch.zipCode);
    }

    if (patch.city !== undefined) {
      setAddressCity(patch.city);
    }

    if (patch.state !== undefined) {
      setAddressState(patch.state);
    }

    if (patch.addressCountry !== undefined) {
      setAddressCountry(patch.addressCountry);
    }

    setDetectedLocation(nextDetectedLocation);
    setLocationDetected(true);
    setLocationStatus(status);

    // Show auto-fill success
    setIsAutoFilling(false);
    setDetectionStatus('Address auto-filled from GPS');
    setTimeout(() => setDetectionStatus(null), 3000);
  };

  /* ─── GPS refresh ─── */
  const refreshLocation = async (uid: string) => {
    setIsDetectingLocation(true);
    setLocationStatus('detecting');
    try {
      const result = await locationService.refreshStep4Location(uid);
      if (result.fresh) {
        applyDetectedLocation(
          result.fresh.data,
          result.fresh.source === 'gps' ? 'success' : 'ip-success'
        );
        // Save to DB in background (GPS columns are written here)
        locationService
          .saveLocationToOnboarding(uid, result.fresh.data, result.fresh.source === 'gps' ? 'gps' : 'ip')
          .catch(() => {});
        return;
      }
      if (result.cached) {
        applyDetectedLocation(result.cached.data, getStatusFromCacheRecord(result.cached));
        return;
      }
      setLocationStatus('failed');
    } catch (err) {
      console.error('[Step3-Combined] Location refresh error:', err);
      const cachedRecord = await locationService.readSharedLocationCache(uid);
      if (cachedRecord) {
        applyDetectedLocation(cachedRecord.data, getStatusFromCacheRecord(cachedRecord));
      } else {
        setLocationStatus('failed');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  /* ─── Init: Load saved data, detect location ─── */
  useEffect(() => {
    const init = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      // Fetch all relevant data in parallel
      const [onboardingResult, financialResult, enrichedResult, sharedCache] = await Promise.all([
        config.supabaseClient
          .from('onboarding_data')
          .select(`
            citizenship_country, residence_country, current_step,
            address_line_1, address_line_2, city, state, zip_code, address_country
          `)
          .eq('user_id', user.id)
          .maybeSingle(),
        config.supabaseClient
          .from('user_financial_data')
          .select('identity_data')
          .eq('user_id', user.id)
          .maybeSingle(),
        config.supabaseClient
          .from('user_enriched_profiles')
          .select('enriched_address_line1, enriched_address_zip')
          .eq('user_id', user.id)
          .maybeSingle(),
        locationService.readSharedLocationCache(user.id),
      ]);

      const cachedLocation = sharedCache?.data || await locationService.getCachedLocation(user.id);
      const onboardingData = onboardingResult.data || null;
      const initialFormState: Step3FormState = {
        citizenshipCountry: '',
        residenceCountry: '',
        addressLine1: '',
        addressLine2: '',
        zipCode: '',
        city: '',
        state: '',
        addressCountry: '',
      };

      // ─── Prefill citizenship/residence countries ───
      const trustedCountries = getTrustedStep4Countries(onboardingData);
      const resolved = resolveOnboardingPrefill({
        onboardingData: { ...trustedCountries, ...(onboardingData || {}) },
        plaidIdentity: financialResult.data?.identity_data,
        enrichedProfile: enrichedResult.data
          ? {
              address_line_1: enrichedResult.data.enriched_address_line1 || '',
              zip_code: enrichedResult.data.enriched_address_zip || '',
            }
          : undefined,
        locationData: cachedLocation || undefined,
      });

      initialFormState.citizenshipCountry = resolved.values.citizenship_country || '';
      initialFormState.residenceCountry = resolved.values.residence_country || '';
      initialFormState.addressLine1 = resolved.values.address_line_1 || '';
      initialFormState.addressLine2 = resolved.values.address_line_2 || '';
      initialFormState.zipCode = resolved.values.zip_code || '';
      initialFormState.city = resolved.values.city || '';
      initialFormState.state = resolved.values.state || '';
      initialFormState.addressCountry = resolved.values.address_country || '';

      if (cachedLocation) {
        const cachedLocationDetails = resolveDetectedLocationForStep3(cachedLocation, countries);

        if (
          !initialFormState.addressLine1 ||
          isClearlyTruncatedAddressLine1(
            initialFormState.addressLine1,
            cachedLocationDetails.normalizedAddress.addressLine1
          )
        ) {
          initialFormState.addressLine1 = cachedLocationDetails.normalizedAddress.addressLine1;
        }

        if (
          !initialFormState.addressLine2 ||
          looksLikeAutoFilledCityStateLine2(
            initialFormState.addressLine2,
            cachedLocationDetails.normalizedAddress.city,
            cachedLocationDetails.normalizedAddress.state
          )
        ) {
          initialFormState.addressLine2 = cachedLocationDetails.normalizedAddress.addressLine2;
        }

        if (!initialFormState.zipCode && cachedLocationDetails.normalizedAddress.zipCode) {
          initialFormState.zipCode = cachedLocationDetails.normalizedAddress.zipCode;
        }

        if (!initialFormState.city && cachedLocationDetails.normalizedAddress.city) {
          initialFormState.city = cachedLocationDetails.normalizedAddress.city;
        }

        if (!initialFormState.state && cachedLocationDetails.normalizedAddress.state) {
          initialFormState.state = cachedLocationDetails.normalizedAddress.state;
        }

        if (!initialFormState.addressCountry && cachedLocationDetails.normalizedAddress.addressCountry) {
          initialFormState.addressCountry = cachedLocationDetails.normalizedAddress.addressCountry;
        }

        if (!initialFormState.citizenshipCountry && cachedLocationDetails.matchedCountry) {
          initialFormState.citizenshipCountry = cachedLocationDetails.matchedCountry;
        }

        if (!initialFormState.residenceCountry && cachedLocationDetails.matchedCountry) {
          initialFormState.residenceCountry = cachedLocationDetails.matchedCountry;
        }
      }

      citizenshipCountryRef.current = initialFormState.citizenshipCountry;
      residenceCountryRef.current = initialFormState.residenceCountry;
      formStateRef.current = initialFormState;

      if (initialFormState.citizenshipCountry) setCitizenshipCountry(initialFormState.citizenshipCountry);
      if (initialFormState.residenceCountry) setResidenceCountry(initialFormState.residenceCountry);
      if (initialFormState.addressLine1) setAddressLine1(initialFormState.addressLine1);
      if (initialFormState.addressLine2) setAddressLine2(initialFormState.addressLine2);
      if (initialFormState.zipCode) setZipCode(initialFormState.zipCode);
      if (initialFormState.city) setAddressCity(initialFormState.city);
      if (initialFormState.state) setAddressState(initialFormState.state);
      if (initialFormState.addressCountry) setAddressCountry(initialFormState.addressCountry);

      // Fallback: extract country from cached GPS for citizenship/residence
      if (cachedLocation) {
        const cachedCountryName = COUNTRY_CODE_TO_NAME[cachedLocation.countryCode] || cachedLocation.country;
        const matchedCached = countries.includes(cachedCountryName) ? cachedCountryName : '';
        if (!citizenshipCountryRef.current && matchedCached) {
          citizenshipCountryRef.current = matchedCached;
          setCitizenshipCountry(matchedCached);
        }
        if (!residenceCountryRef.current && matchedCached) {
          residenceCountryRef.current = matchedCached;
          setResidenceCountry(matchedCached);
        }
        setDetectedLocation(
          cachedLocation.formattedAddress || cachedLocation.city || cachedLocation.state || cachedLocation.country
        );
        setLocationDetected(true);
        setLocationStatus(getStatusFromCacheRecord(sharedCache) || 'ip-success');
      }

      // ─── Auto-detect GPS if needed ───
      if (!autoDetectionStartedRef.current) {
        autoDetectionStartedRef.current = true;
        if (cachedLocation) {
          void refreshLocation(user.id);
        } else {
          const permState = await checkGeoPermission();
          if (permState === 'granted') {
            void refreshLocation(user.id);
          } else {
            setShowLocationModal(true);
          }
        }
      }
    };
    init();
    return () => { locationService.cancel(); };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Country/Residence handlers ─── */
  const handleCitizenshipChange = (value: string) => {
    manualOverridesRef.current.citizenshipCountry = true;
    citizenshipCountryRef.current = value;
    setCitizenshipCountry(value);
    setLocationStatus('manual');
  };

  const handleResidenceChange = (value: string) => {
    manualOverridesRef.current.residenceCountry = true;
    residenceCountryRef.current = value;
    setResidenceCountry(value);
    setLocationStatus('manual');
  };

  /* ─── Location modal handlers ─── */
  const handleAllowLocation = async () => {
    if (!userId) return;
    setShowLocationModal(false);
    await refreshLocation(userId);
  };
  const handleDontAllow = () => {
    setShowLocationModal(false);
    setLocationStatus('manual');
  };

  const handleRetry = async () => {
    if (userId) await refreshLocation(userId);
  };

  const handleDetectClick = async () => {
    if (!userId) return;
    setIsDetectingLocation(true);
    setIsAutoFilling(true);
    setDetectionStatus('Detecting location...');
    try {
      const result = await locationService.detectLocation();
      if (result.data) {
        applyDetectedLocation(
          result.data,
          result.source === 'detected' ? 'success' : 'ip-success'
        );
        locationService
          .saveLocationToOnboarding(userId, result.data, result.source === 'detected' ? 'gps' : 'ip')
          .catch(() => {});
      } else {
        setDetectionStatus(null);
        setIsAutoFilling(false);
      }
    } catch {
      setDetectionStatus(null);
      setIsAutoFilling(false);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  /* ─── Address field handlers ─── */
  const handleAddressLine1Change = (value: string) => {
    manualOverridesRef.current.addressLine1 = true;
    setAddressLine1(value);
    if (touched.addressLine1) setErrors((p) => ({ ...p, addressLine1: validateAddress(value) }));
  };

  const handleAddressLine2Change = (value: string) => {
    manualOverridesRef.current.addressLine2 = true;
    setAddressLine2(value);
  };

  const handleZipCodeChange = (value: string) => {
    const next = value.slice(0, 10);
    manualOverridesRef.current.zipCode = true;
    setZipCode(next);
    if (touched.zipCode) setErrors((p) => ({ ...p, zipCode: validateZip(next) }));
  };

  const validate = (field: string, value: string) => {
    switch (field) {
      case 'addressLine1': return validateAddress(value);
      case 'zipCode': return validateZip(value);
      default: return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: validate(field, value) }));
  };

  const validateAll = () => {
    const next = {
      addressLine1: validateAddress(addressLine1),
      zipCode: validateZip(zipCode),
    };
    setErrors(next);
    setTouched({ addressLine1: true, zipCode: true });
    return !Object.values(next).some(Boolean);
  };

  /* ─── Navigation ─── */
  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;

    // Validate address fields if they're filled
    if (addressLine1.trim() || zipCode.trim()) {
      if (!validateAll()) {
        setError('Please fix the errors above');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const payload = buildStep3SavePayload({
        citizenshipCountry,
        residenceCountry,
        addressLine1,
        addressLine2,
        zipCode,
        city: addressCity,
        state: addressState,
        addressCountry,
        currentStep: 4,
      } as Step3FormState & { currentStep: number });

      const { error: saveError } = await upsertOnboardingData(userId, payload);
      if (saveError) {
        throw new Error(saveError.message);
      }
      navigate('/onboarding/step-4');
    } catch (err) {
      console.error('[Step3-Combined] Save error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => navigate('/onboarding/step-2');

  const handleSkip = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (userId && config.supabaseClient) {
        const { error: saveError } = await upsertOnboardingData(userId, { current_step: 4 });
        if (saveError) {
          throw new Error(saveError.message);
        }
      }
      navigate('/onboarding/step-4');
    } catch (err) {
      console.error('[Step3-Combined] Skip save error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Country/Residence
    citizenshipCountry,
    residenceCountry,
    handleCitizenshipChange,
    handleResidenceChange,

    // Address fields
    addressLine1,
    addressLine2,
    handleAddressLine2Change,
    zipCode,
    handleAddressLine1Change,
    handleZipCodeChange,
    handleBlur,
    touched,
    errors,
    error,

    // Location detection
    isDetectingLocation,
    locationDetected,
    locationStatus,
    detectedLocation,
    showPermissionHelp,
    setShowPermissionHelp,
    showLocationModal,
    isAutoFilling,
    detectionStatus,

    // Handlers
    handleAllowLocation,
    handleDontAllow,
    handleRetry,
    handleDetectClick,
    handleContinue,
    handleBack,
    handleSkip,

    // UI state
    isLoading,
    isFooterVisible,
    canContinue,
    isErrorStatus,
    isSuccessStatus,
  };
}
