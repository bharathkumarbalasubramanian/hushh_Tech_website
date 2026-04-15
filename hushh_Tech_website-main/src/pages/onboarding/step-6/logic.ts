/**
 * Step 9 - SSN + Date of Birth — Logic Hook
 *
 * All state, effects, handlers, and constants for the SSN & DOB step.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { getOnboardingDisplayMeta } from '../../../services/onboarding/flow';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../../utils/useFooterVisibility';

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const DISPLAY_META = getOnboardingDisplayMeta('/onboarding/step-6');

export const DISPLAY_STEP = DISPLAY_META.displayStep;
export const TOTAL_STEPS = DISPLAY_META.totalSteps;
export const PROGRESS_PCT = Math.round((DISPLAY_STEP / TOTAL_STEPS) * 100);

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MINIMUM_ONBOARDING_AGE = 18;
export const MINIMUM_DOB_YEAR = 1930;

const normalizeToday = (value: Date) =>
  new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));

export const buildDobYearOptions = (
  today: Date = new Date(),
  minimumYear: number = MINIMUM_DOB_YEAR,
  minimumAge: number = MINIMUM_ONBOARDING_AGE
) => {
  const latestAdultYear = normalizeToday(today).getUTCFullYear() - minimumAge;
  const count = latestAdultYear - minimumYear + 1;
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => String(latestAdultYear - i));
};

export const resolveDobEligibility = (
  dobMonth: string,
  dobDay: string,
  dobYear: string,
  today: Date = new Date()
) => {
  if (!dobMonth || !dobDay || !dobYear || dobYear.length !== 4) {
    return {
      isComplete: false,
      isValidDate: false,
      isAdult: false,
      ageError: null as string | null,
    };
  }

  const month = Number(dobMonth);
  const day = Number(dobDay);
  const year = Number(dobYear);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12
  ) {
    return {
      isComplete: true,
      isValidDate: false,
      isAdult: false,
      ageError: null as string | null,
    };
  }

  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    birthDate.getUTCFullYear() === year &&
    birthDate.getUTCMonth() === month - 1 &&
    birthDate.getUTCDate() === day;

  if (!isValidDate) {
    return {
      isComplete: true,
      isValidDate: false,
      isAdult: false,
      ageError: null as string | null,
    };
  }

  const normalizedToday = normalizeToday(today);
  let age = normalizedToday.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = normalizedToday.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && normalizedToday.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  const isAdult = age >= MINIMUM_ONBOARDING_AGE;

  return {
    isComplete: true,
    isValidDate: true,
    isAdult,
    ageError: isAdult ? null : `You must be at least ${MINIMUM_ONBOARDING_AGE} years old to continue`,
  };
};

/* ═══════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════ */

export function useStep9Logic() {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();
  const [ssn, setSsn] = useState('');
  const [dob, setDob] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ─── Helpers ─── */
  const formatIsoToDisplay = (iso?: string | null) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return iso;
  };

  const parseDobToIso = (value: string) => {
    if (!value) return null;
    const parts = value.split('/');
    if (parts.length === 3) {
      let [p1, p2, year] = parts.map((p) => p.trim());
      let month = p1, day = p2;
      if (parseInt(p1, 10) > 12) { day = p1; month = p2; }
      const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (!Number.isNaN(Date.parse(iso))) return iso;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) return value;
    return null;
  };

  /* ─── Load saved data ─── */
  useEffect(() => {
    const loadData = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) return;

      const { data } = await config.supabaseClient
        .from('onboarding_data')
        .select('ssn_encrypted, date_of_birth')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.date_of_birth) {
        const saved = formatIsoToDisplay(data.date_of_birth);
        if (saved) setDob(saved);
        // Also populate dropdowns from ISO date
        const parts = data.date_of_birth.split('-');
        if (parts.length === 3) {
          setDobYear(parts[0]);
          setDobMonth(parts[1]);
          setDobDay(parts[2]);
        }
      }
      if (data?.ssn_encrypted && data.ssn_encrypted !== '999-99-9999') {
        setSsn(data.ssn_encrypted);
      }
    };
    loadData();
  }, []);

  /* ─── Formatters ─── */
  const formatSSN = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 9)}`;
  };

  const formatDate = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
  };

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => setSsn(formatSSN(e.target.value));
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => setDob(formatDate(e.target.value));

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setDob(formatIsoToDisplay(e.target.value));
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.click();
    }
  };

  // Sync dob string from dropdown selections
  useEffect(() => {
    if (dobMonth && dobDay && dobYear) {
      setDob(`${dobMonth}/${dobDay}/${dobYear}`);
    }
  }, [dobMonth, dobDay, dobYear]);

  const yearOptions = buildDobYearOptions();

  // Days in selected month/year
  const daysInMonth = dobMonth && dobYear
    ? new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate()
    : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  // Correct day if month changed and day is now out of range
  useEffect(() => {
    if (dobDay && parseInt(dobDay) > daysInMonth) {
      setDobDay(String(daysInMonth).padStart(2, '0'));
    }
  }, [dobMonth, dobYear, daysInMonth, dobDay]);

  const dobEligibility = resolveDobEligibility(dobMonth, dobDay, dobYear);
  const isUnder18 =
    dobEligibility.isComplete && dobEligibility.isValidDate && !dobEligibility.isAdult;
  const ageError = dobEligibility.ageError;
  const isFormValid =
    dobEligibility.isComplete && dobEligibility.isValidDate && dobEligibility.isAdult;

  /* ─── Handlers ─── */
  const handleContinue = async () => {
    if (!dobEligibility.isComplete) { setError('Please enter your date of birth'); return; }
    if (!dobEligibility.isValidDate) { setError('Please enter a valid date of birth'); return; }
    if (!dobEligibility.isAdult) { setError(ageError || 'You must be at least 18 years old to continue'); return; }
    setLoading(true); setError(null);

    if (!config.supabaseClient) { setError('Configuration error'); setLoading(false); return; }
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const isoDob = parseDobToIso(dob);
    if (!isoDob) { setError('Please enter a valid date (MM/DD/YYYY)'); setLoading(false); return; }

    const { error: e } = await upsertOnboardingData(user.id, {
      ssn_encrypted: ssn, date_of_birth: isoDob, current_step: 9,
    });
    if (e) { setError('Failed to save data'); setLoading(false); return; }
    navigate('/onboarding/step-7');
  };

  const handleSkip = async () => {
    if (!dobEligibility.isComplete) { setError('Please enter your date of birth before skipping'); return; }
    if (!dobEligibility.isValidDate) { setError('Please enter a valid date of birth'); return; }
    if (!dobEligibility.isAdult) { setError(ageError || 'You must be at least 18 years old to continue'); return; }
    setLoading(true); setError(null);

    if (!config.supabaseClient) { setError('Configuration error'); setLoading(false); return; }
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const isoDob = parseDobToIso(dob);
    if (!isoDob) { setError('Please enter a valid date (MM/DD/YYYY)'); setLoading(false); return; }

    const { error: e } = await upsertOnboardingData(user.id, {
      ssn_encrypted: '999-99-9999', date_of_birth: isoDob, current_step: 9,
    });
    if (e) { setError('Failed to save data'); setLoading(false); return; }
    navigate('/onboarding/step-7');
  };

  const handleBack = () => navigate('/onboarding/step-5');

  const handleShowInfoToggle = (open: boolean) => setShowInfo(open);

  return {
    // State
    ssn,
    dob,
    dobMonth,
    setDobMonth,
    dobDay,
    setDobDay,
    dobYear,
    setDobYear,
    loading,
    error,
    showInfo,
    isFormValid,
    isFooterVisible,
    dateInputRef,

    // Derived
    yearOptions,
    dayOptions,
    daysInMonth,
    isUnder18,
    ageError,

    // Handlers
    handleSSNChange,
    handleDobChange,
    handleNativeDateChange,
    openDatePicker,
    handleContinue,
    handleSkip,
    handleBack,
    handleShowInfoToggle,
  };
}
