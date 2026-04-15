import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { locationService, type LocationData } from '../../services/location';
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';

// Back arrow icon
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Chevron down icon for select
const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Country codes with flags (sorted by most common)
const countryCodes = [
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
];

export default function OnboardingStep6() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const isFooterVisible = useFooterVisibility();
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  const detectLocationForDialCode = async (uid: string, cachedDialCode?: string) => {
    setIsDetectingLocation(true);
    setLocationMessage('Detecting your country code...');

    try {
      const result = await locationService.detectLocation();

      if (!result.data) {
        throw new Error(result.error || 'Could not detect location');
      }

      const locationData: LocationData = result.data;
      const dialCode = locationData.phoneDialCode;
      const dialCodeExists = countryCodes.some(c => c.code === dialCode);

      // Cache the detected location for other steps (even if the dial code isn't in our short list).
      if (config.supabaseClient) {
        try {
          await locationService.saveLocationToOnboarding(uid, locationData);
        } catch (saveErr) {
          console.warn('[Step6] Failed to cache location:', saveErr);
        }
      }

      if (dialCodeExists) {
        setCountryCode(dialCode);
        setLocationMessage(`Detected: ${locationData.city || locationData.country}`);
        console.log('[Step6] Detected phone dial code:', dialCode, 'via', result.source);
      } else if (cachedDialCode && countryCodes.some(c => c.code === cachedDialCode)) {
        setCountryCode(cachedDialCode);
        setLocationMessage('Using your previous detected country code');
      } else {
        setLocationMessage(null);
      }

      setTimeout(() => {
        if (!isUnmountedRef.current) setLocationMessage(null);
      }, 2000);
    } catch (error) {
      console.log('[Step6] Location detection failed:', error);

      if (cachedDialCode && countryCodes.some(c => c.code === cachedDialCode)) {
        setCountryCode(cachedDialCode);
        setLocationMessage('Using your previous detected country code');
        setTimeout(() => {
          if (!isUnmountedRef.current) setLocationMessage(null);
        }, 2000);
      } else {
        setLocationMessage(null);
      }
    } finally {
      if (!isUnmountedRef.current) setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    isUnmountedRef.current = false;

    const getCurrentUser = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      // Load existing data
      const { data: onboardingData } = await config.supabaseClient
        .from('onboarding_data')
        // Select * to remain compatible across schema revisions (gps_detected_* columns may not exist).
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If user has already saved a phone number, use their saved data
      if (onboardingData?.phone_number) {
        setPhoneNumber(onboardingData.phone_number);
        if (onboardingData?.phone_country_code) {
          setCountryCode(onboardingData.phone_country_code);
          console.log('[Step6] Using saved phone country code:', onboardingData.phone_country_code);
          return;
        }
      }

      const cachedDialCode = (onboardingData as any)?.gps_detected_phone_dial_code || undefined;
      if (cachedDialCode && countryCodes.some(c => c.code === cachedDialCode)) {
        // Pre-fill immediately from cache, then attempt fresh detection.
        setCountryCode(cachedDialCode);
      }

      // Detect fresh (GPS if available, otherwise IP fallback).
      console.log('[Step6] Detecting location for phone dial code...');
      detectLocationForDialCode(user.id, cachedDialCode);
    };

    getCurrentUser();
    
    return () => {
      isUnmountedRef.current = true;
      locationService.cancel();
    };
  }, [navigate]);

  const handleContinue = async () => {
    if (!phoneNumber || !userId || !config.supabaseClient) return;

    setIsLoading(true);
    try {
      await config.supabaseClient
        .from('onboarding_data')
        .update({
          phone_number: phoneNumber,
          phone_country_code: countryCode,
          current_step: 6,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      navigate('/onboarding/step-7');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/step-5');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  const isValidPhone = phoneNumber.length >= 10;

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-6 pb-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-900 hover:text-[#2b8cee] transition-colors"
          >
            <BackIcon />
            <span className="text-base font-bold tracking-tight">Back</span>
          </button>
          <div className="flex-1" />
        </header>

        <OnboardingStepProgress currentStep={6} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 sm:px-6 pb-40 sm:pb-48">
          {/* Header Section - Center Aligned */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">
              Enter your phone number
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              We'll send a confirmation code to verify your identity.
            </p>

            {locationMessage && (
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {isDetectingLocation && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2b8cee] animate-pulse" aria-hidden="true" />
                  )}
                  <span>{locationMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* Phone Input Form */}
          <div className="flex flex-col gap-4">
            {/* Phone Input Group */}
            <div className="flex w-full items-center gap-3">
              {/* Country Code Selector */}
              <div className="relative h-14 w-[110px] flex-shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-full w-full appearance-none rounded-full border border-gray-200 bg-white pl-4 pr-8 text-base font-bold text-slate-900 focus:border-[#2b8cee] focus:outline-none focus:ring-1 focus:ring-[#2b8cee] cursor-pointer"
                >
                  {countryCodes.map((country) => (
                    <option key={`${country.country}-${country.code}`} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="relative h-14 flex-1">
                <input
                  type="tel"
                  value={formatPhoneNumber(phoneNumber)}
                  onChange={handlePhoneChange}
                  placeholder="(555) 000-0000"
                  className="h-full w-full rounded-full border border-gray-200 bg-white px-5 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#2b8cee] focus:outline-none focus:ring-1 focus:ring-[#2b8cee] transition-all"
                />
              </div>
            </div>

            {/* Helper Text */}
            <p className="px-2 text-xs font-medium text-slate-400">
              Standard message and data rates may apply.
            </p>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/90 backdrop-blur-md px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-3 sm:gap-4"
            data-onboarding-footer
          >
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!isValidPhone || isLoading}
              data-onboarding-cta
              className={`
                flex w-full cursor-pointer items-center justify-center rounded-full h-11 sm:h-12 px-6 text-sm sm:text-base font-semibold transition-all active:scale-[0.98]
                ${isValidPhone && !isLoading
                  ? 'bg-[#2b8cee] hover:bg-[#2070c0] text-white shadow-md shadow-[#2b8cee]/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
