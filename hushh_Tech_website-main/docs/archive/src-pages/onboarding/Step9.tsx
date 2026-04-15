/**
 * Step 9 - SSN + Date of Birth (iOS-native design)
 *
 * Collects Social Security Number (optional) and Date of Birth (required).
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const DISPLAY_STEP = 8;
const TOTAL_STEPS = 12;
const PROGRESS_PCT = Math.round((DISPLAY_STEP / TOTAL_STEPS) * 100);

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */

export default function OnboardingStep9() {
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

  // Generate year options (current year down to 1930)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1929 }, (_, i) => String(currentYear - i));
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
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

  const isFormValid = !!(dobMonth && dobDay && dobYear && dobYear.length === 4);

  /* ─── Handlers ─── */
  const handleContinue = async () => {
    if (!isFormValid) { setError('Please enter your date of birth'); return; }
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
    navigate('/onboarding/step-11');
  };

  const handleSkip = async () => {
    if (!isFormValid) { setError('Please enter your date of birth before skipping'); return; }
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
    navigate('/onboarding/step-11');
  };

  const handleBack = () => navigate('/onboarding/step-8');

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div
      className="bg-white min-h-[100dvh] flex flex-col"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      {/* ═══ iOS Navigation Bar ═══ */}
      <nav
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#C6C6C8]/30 flex items-end justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 4px)', minHeight: '48px' }}
      >
        <button onClick={handleBack} className="text-[#007AFF] flex items-center -ml-2 active:opacity-50 transition-opacity" aria-label="Go back">
          <span className="material-symbols-outlined text-3xl -mr-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>chevron_left</span>
          <span className="text-[17px] leading-none pb-[2px]">Back</span>
        </button>
        <span className="font-semibold text-[17px] text-black">Setup</span>
        <button onClick={handleSkip} className="text-[17px] text-[#007AFF] font-normal active:opacity-50 transition-opacity">Skip</button>
      </nav>

      <main className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-4 pb-48">
        {/* ─── Progress Bar ─── */}
        <div className="mt-6 mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Onboarding Progress</span>
            <span className="text-[13px] text-[#8E8E93]">Step {DISPLAY_STEP} of {TOTAL_STEPS}</span>
          </div>
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#007AFF] rounded-full transition-all duration-500" style={{ width: `${PROGRESS_PCT}%` }} />
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-[#007AFF]">{PROGRESS_PCT}% complete</p>
        </div>

        {/* ─── Title ─── */}
        <div className="mb-8">
          <h1 className="text-[34px] leading-tight font-bold text-black tracking-tight mb-3">
            We just need a few more details
          </h1>
          <p className="text-[17px] leading-snug text-[#8E8E93]">
            Federal law requires us to collect this info for tax reporting.
          </p>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
        )}

        {/* ─── SSN Section ─── */}
        <div className="mb-6">
          <h2 className="ml-4 mb-2 text-[13px] uppercase text-[#8E8E93] font-normal">Social Security Number</h2>
          <div className="bg-white rounded-xl overflow-hidden ring-1 ring-black/5">
            {/* SSN Input */}
            <div className="flex items-center px-4 py-3 bg-white">
              <input
                type="text"
                value={ssn}
                onChange={handleSSNChange}
                placeholder="000-00-0000"
                maxLength={11}
                inputMode="numeric"
                className="flex-1 bg-transparent border-none p-0 text-[17px] text-black placeholder-gray-400 focus:ring-0 outline-none tracking-widest"
              />
              <span className="material-symbols-outlined text-gray-400 text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>lock</span>
            </div>

            {/* Hairline separator */}
            <div className="ml-4 h-[0.5px] bg-[#C6C6C8]/50" />

            {/* Why SSN expandable */}
            <details
              className="group"
              open={showInfo}
              onToggle={(e) => setShowInfo((e.target as HTMLDetailsElement).open)}
            >
              <summary className="w-full flex items-center justify-between px-4 py-3.5 bg-white active:bg-gray-50 transition-colors cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#007AFF] text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>info</span>
                  <span className="text-[15px] text-[#007AFF] font-medium">Why do we need your SSN?</span>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-base transform transition-transform group-open:rotate-180" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>expand_more</span>
              </summary>
              <div className="px-4 pb-4 pt-1">
                <p className="text-[13px] leading-relaxed text-[#8E8E93]">
                  We are required by federal law to collect this information to prevent fraud and verify your identity before opening an investment account.
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* ─── DOB Section — 3 iOS Dropdown Selectors ─── */}
        <div className="mb-8">
          <h2 className="ml-4 mb-2 text-[13px] uppercase text-[#8E8E93] font-normal">Date of birth</h2>
          <div className="bg-white rounded-xl overflow-hidden ring-1 ring-black/5">
            {/* Month selector */}
            <div className="flex items-center px-4 py-3 relative">
              <span className="text-[15px] text-[#8E8E93] w-16 shrink-0">Month</span>
              <select
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                aria-label="Birth month"
                className="flex-1 bg-transparent border-none p-0 text-[17px] text-black focus:ring-0 outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Select month</option>
                {monthNames.map((name, idx) => (
                  <option key={name} value={String(idx + 1).padStart(2, '0')}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[#C7C7CC] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>expand_more</span>
            </div>

            {/* Hairline */}
            <div className="ml-4 h-[0.5px] bg-[#C6C6C8]/50" />

            {/* Day selector */}
            <div className="flex items-center px-4 py-3 relative">
              <span className="text-[15px] text-[#8E8E93] w-16 shrink-0">Day</span>
              <select
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                aria-label="Birth day"
                className="flex-1 bg-transparent border-none p-0 text-[17px] text-black focus:ring-0 outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Select day</option>
                {dayOptions.map((d) => (
                  <option key={d} value={d}>{parseInt(d)}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[#C7C7CC] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>expand_more</span>
            </div>

            {/* Hairline */}
            <div className="ml-4 h-[0.5px] bg-[#C6C6C8]/50" />

            {/* Year selector */}
            <div className="flex items-center px-4 py-3 relative">
              <span className="text-[15px] text-[#8E8E93] w-16 shrink-0">Year</span>
              <select
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                aria-label="Birth year"
                className="flex-1 bg-transparent border-none p-0 text-[17px] text-black focus:ring-0 outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Select year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[#C7C7CC] text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>expand_more</span>
            </div>
          </div>
          {/* Confirmation text when all selected */}
          {isFormValid && (
            <p className="ml-4 mt-2 text-[13px] text-[#34C759] font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>check_circle</span>
              {monthNames[parseInt(dobMonth) - 1]} {parseInt(dobDay)}, {dobYear}
            </p>
          )}
        </div>
      </main>

      {/* ═══ Fixed Footer — Skip + Continue ═══ */}
      {!isFooterVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#C6C6C8]/30 px-4 pt-4 z-40"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          data-onboarding-footer
        >
          <div className="max-w-md mx-auto flex gap-4">
            <button
              onClick={handleSkip}
              className="flex-1 h-[50px] rounded-xl bg-gray-200/80 text-[#007AFF] font-semibold text-[17px] active:scale-[0.98] transition-transform flex items-center justify-center"
            >
              Skip
            </button>
            <button
              onClick={handleContinue}
              disabled={!isFormValid || loading}
              data-onboarding-cta
              className={`flex-1 h-[50px] rounded-xl font-semibold text-[17px] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center ${
                isFormValid && !loading
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
