/**
 * FinancialLink — All Business Logic
 * Pre-onboarding financial verification via Plaid.
 * Uses usePlaidLinkHook for the full Plaid Link flow.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import { formatCurrency } from '../../../services/plaid/plaidService';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import {
  FINANCIAL_LINK_ROUTE,
  getFinancialLinkContinuationRoute,
  resolveFinancialLinkStatus,
} from '../../../services/onboarding/flow';
import { fetchOnboardingProgress } from '../../../services/onboarding/progress';

export { formatCurrency };

export const useFinancialLinkLogic = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);
  const [resumeRoute, setResumeRoute] = useState<string>(getFinancialLinkContinuationRoute(1));
  const hasInitialized = useRef(false);

  /* Scroll to top */
  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* Get authenticated user — runs only once */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const getUser = async () => {
      if (!config.supabaseClient) { navigate('/login'); return; }
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(FINANCIAL_LINK_ROUTE)}`, {
          replace: true,
        });
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || undefined);

      try {
        const onboardingProgress = await fetchOnboardingProgress(
          config.supabaseClient,
          user.id
        );
        const { data: financialData, error: fetchError } = await config.supabaseClient
          .from('user_financial_data').select('status').eq('user_id', user.id).maybeSingle();
        if (fetchError) console.warn('[FinancialLink] Supabase query error (ignoring):', fetchError.message);
        const effectiveStatus = resolveFinancialLinkStatus(
          onboardingProgress?.financial_link_status,
          financialData?.status
        );

        if (
          effectiveStatus === 'completed' &&
          onboardingProgress?.financial_link_status !== 'completed'
        ) {
          void upsertOnboardingData(user.id, { financial_link_status: 'completed' });
        }

        if (onboardingProgress?.is_completed) {
          navigate('/hushh-user-profile', { replace: true });
          return;
        }

        const nextRoute = getFinancialLinkContinuationRoute(
          onboardingProgress?.current_step || 1
        );
        setCurrentOnboardingStep(onboardingProgress?.current_step || 1);
        setResumeRoute(nextRoute);

        if (effectiveStatus !== 'pending') {
          navigate(nextRoute, { replace: true });
          return;
        }
      } catch (err) {
        console.warn('[FinancialLink] Error checking financial data (ignoring):', err);
      }

      setIsReady(true);
    };

    getUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Plaid hook — the real integration ─── */
  const plaid = usePlaidLinkHook(userId, userEmail);

  /* ─── Extract all accounts from balance data ─── */
  const allAccounts = useMemo(() => {
    return plaid.financialData?.balance?.data?.accounts || [];
  }, [plaid.financialData]);

  /* ─── Group accounts by type ─── */
  const accountGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const acc of allAccounts) {
      const key = acc.type || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(acc);
    }
    return groups;
  }, [allAccounts]);

  /* ─── Total balance ─── */
  const totalBalance = useMemo(() => {
    return allAccounts.reduce((sum: number, acc: any) => {
      const bal = acc.balances?.current ?? acc.balances?.available ?? 0;
      return sum + bal;
    }, 0);
  }, [allAccounts]);

  /* ─── Identity data ─── */
  const identityInfo = useMemo(() => {
    const id = plaid.financialData?.identity?.data;
    if (!id) return null;
    const accounts = id.accounts || [];
    if (accounts.length === 0) return null;
    const owners = accounts[0]?.owners || [];
    if (owners.length === 0) return null;
    const owner = owners[0];
    const rawEmails = (owner.emails || []).map((e: any) => e.data).filter(Boolean);
    const uniqueEmails = [...new Set(rawEmails.map((e: string) => e.toLowerCase()))];
    const rawPhones = (owner.phone_numbers || []).map((p: any) => p.data).filter(Boolean);
    const uniquePhones = [...new Set(rawPhones)];
    return {
      names: owner.names || [],
      emails: uniqueEmails,
      phones: uniquePhones,
      addresses: (owner.addresses || []).map((a: any) => {
        const d = a.data || {};
        return [d.street, d.city, d.region, d.postal_code, d.country].filter(Boolean).join(', ');
      }),
    };
  }, [plaid.financialData]);

  /* ─── Investment holdings ─── */
  const investmentHoldings = useMemo(() => {
    return plaid.financialData?.investments?.data?.holdings || [];
  }, [plaid.financialData]);

  /* ─── UI state derived from Plaid ─── */
  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);
  const isInitializing = plaid.step === 'idle' || plaid.step === 'creating_token';
  const isDone = plaid.step === 'done';
  const canProceed = isDone && plaid.canProceed;

  const buttonText = useMemo(() => {
    if (plaid.step === 'idle' || plaid.step === 'creating_token') return 'Preparing...';
    if (plaid.step === 'linking') return 'Connecting...';
    if (plaid.step === 'exchanging') return 'Securing Connection...';
    if (plaid.step === 'fetching') return 'Fetching Financial Data...';
    if (isDone && canProceed) return 'Continue to KYC';
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) return 'Try Again';
    return 'Connect Bank Account';
  }, [plaid.step, plaid.canProceed, isDone, canProceed]);

  const isButtonDisabled = isInitializing || isProcessing;

  /* ─── Verification row statuses ─── */
  const verificationRows = useMemo(() => {
    const balanceStatus = plaid.balanceStatus;
    const assetsStatus = plaid.assetsStatus;
    const investmentsStatus = plaid.investmentsStatus;
    const hasIdentity = !!identityInfo;

    return [
      {
        icon: 'account_balance_wallet',
        title: 'Assets',
        subtitle: balanceStatus === 'success'
          ? `${allAccounts.length} Accounts · ${formatCurrency(totalBalance)}`
          : balanceStatus === 'loading' ? 'Fetching...' : 'Not Available',
        status: balanceStatus,
      },
      {
        icon: 'monitoring',
        title: 'Investments',
        subtitle: investmentsStatus === 'success' && investmentHoldings.length > 0
          ? `${investmentHoldings.length} Holdings`
          : investmentsStatus === 'loading' ? 'Fetching...' : 'No Investment Accounts',
        status: investmentsStatus,
      },
      {
        icon: 'badge',
        title: 'Identity',
        subtitle: hasIdentity
          ? `✓ Verified — ${identityInfo!.names[0] || ''}`
          : plaid.step === 'done' ? 'Not Available' : 'Not Available',
        status: hasIdentity ? 'success' as const : 'idle' as const,
      },
    ];
  }, [plaid, allAccounts, totalBalance, identityInfo, investmentHoldings]);

  /* ─── Main button handler — Plaid flow ─── */
  const handleButtonClick = useCallback(async () => {
    if (isDone && canProceed) {
      await upsertOnboardingData(userId, {
        current_step: currentOnboardingStep,
        financial_link_status: 'completed',
      });
      navigate(resumeRoute, { replace: true });
      return;
    }
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) {
      plaid.retry();
      return;
    }
    if (plaid.isReady) {
      plaid.openPlaidLink();
    }
  }, [canProceed, currentOnboardingStep, isDone, navigate, plaid, resumeRoute, userId]);

  /* Skip — let user proceed without linking bank */
  const handleSkip = useCallback(async () => {
    console.log('[FinancialLink] User skipped financial verification');
    await upsertOnboardingData(userId, {
      current_step: currentOnboardingStep,
      financial_link_status: 'skipped',
    });
    navigate(resumeRoute, { replace: true });
  }, [currentOnboardingStep, navigate, resumeRoute, userId]);

  return {
    userId,
    userEmail,
    isReady,
    /* Plaid state */
    plaidStep: plaid.step,
    institution: plaid.institution,
    isDone,
    canProceed,
    isProcessing,
    isButtonDisabled,
    buttonText,
    error: plaid.error,
    /* Data */
    verificationRows,
    allAccounts,
    accountGroups,
    totalBalance,
    identityInfo,
    investmentHoldings,
    /* Actions */
    handleButtonClick,
    handleSkip,
    openPlaidLink: plaid.openPlaidLink,
    retry: plaid.retry,
  };
};
