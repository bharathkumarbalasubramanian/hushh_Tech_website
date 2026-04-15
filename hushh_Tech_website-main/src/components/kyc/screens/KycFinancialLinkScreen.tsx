/**
 * KycFinancialLinkScreen - Pre-KYC Financial Verification
 *
 * Shows ALL individual accounts from Plaid, grouped by type.
 * Also shows identity data (name, email, phone, address from bank).
 */
'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Text,
  Button,
  Flex,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import {
  formatCurrency,
  type ProductFetchStatus,
} from '../../../services/plaid/plaidService';
import type { FinancialVerificationResult } from '../../../types/kyc';

/* iOS design tokens */
const IOS = {
  primary: '#007AFF',
  primaryHover: '#0062CC',
  text: '#000000',
  secondary: '#8E8E93',
  bg: '#FFFFFF',
  listBg: '#F9F9FB',
  separator: '#E5E5EA',
  success: '#34C759',
  error: '#FF3B30',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
};

export interface KycFinancialLinkScreenProps {
  userId: string;
  userEmail?: string;
  onContinue: (result: FinancialVerificationResult) => void;
  onSkip?: () => void;
  bankName?: string;
}

/* ─── Account type icon + color mapping ─── */
const accountTypeConfig: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  checking: { icon: 'account_balance', bg: 'rgba(0,122,255,0.1)', color: '#007AFF', label: 'Checking' },
  savings: { icon: 'savings', bg: 'rgba(52,199,89,0.1)', color: '#34C759', label: 'Savings' },
  'credit card': { icon: 'credit_card', bg: 'rgba(255,149,0,0.1)', color: '#FF9500', label: 'Credit Card' },
  mortgage: { icon: 'home', bg: 'rgba(175,82,222,0.1)', color: '#AF52DE', label: 'Mortgage' },
  loan: { icon: 'account_balance_wallet', bg: 'rgba(255,59,48,0.1)', color: '#FF3B30', label: 'Loan' },
  investment: { icon: 'trending_up', bg: 'rgba(0,199,190,0.1)', color: '#00C7BE', label: 'Investment' },
  brokerage: { icon: 'monitoring', bg: 'rgba(0,199,190,0.1)', color: '#00C7BE', label: 'Brokerage' },
  depository: { icon: 'account_balance', bg: 'rgba(0,122,255,0.1)', color: '#007AFF', label: 'Depository' },
  credit: { icon: 'credit_card', bg: 'rgba(255,149,0,0.1)', color: '#FF9500', label: 'Credit' },
  other: { icon: 'account_circle', bg: 'rgba(142,142,147,0.1)', color: '#8E8E93', label: 'Other' },
};

const getAccountConfig = (type: string, subtype: string) => {
  return accountTypeConfig[subtype] || accountTypeConfig[type] || accountTypeConfig.other;
};

/* ─── Single Account Row ─── */
const AccountRow: React.FC<{
  account: any;
  isLast?: boolean;
}> = ({ account, isLast }) => {
  const config = getAccountConfig(account.type, account.subtype);
  const balance = account.balances?.current ?? account.balances?.available;
  const currency = account.balances?.iso_currency_code || 'USD';
  const isNegativeBalance = account.type === 'credit' || account.type === 'loan';

  return (
    <Flex
      align="center" px={4} py={3}
      borderBottom={isLast ? 'none' : '0.5px solid'}
      borderColor={IOS.separator}
    >
      {/* Icon */}
      <Flex
        w="36px" h="36px" borderRadius="10px"
        bg={config.bg} align="center" justify="center"
        mr={3} flexShrink={0}
      >
        <Text
          fontSize="20px" lineHeight="1" color={config.color}
          className="material-symbols-outlined"
          sx={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
        >
          {config.icon}
        </Text>
      </Flex>

      {/* Name + type */}
      <Box flex="1" minW={0}>
        <Text fontSize="16px" fontWeight="500" color={IOS.text} noOfLines={1}>
          {account.name || `${config.label} ...${account.mask}`}
        </Text>
        <Text fontSize="13px" color={IOS.secondary} mt={0.5}>
          {config.label} {account.mask ? `···${account.mask}` : ''}
        </Text>
      </Box>

      {/* Balance */}
      <Text
        fontSize="16px" fontWeight="600"
        color={isNegativeBalance && balance > 0 ? IOS.error : IOS.text}
        flexShrink={0} ml={2}
      >
        {balance != null ? formatCurrency(balance, currency) : '—'}
      </Text>
    </Flex>
  );
};

/* ─── Section Header ─── */
const SectionHeader: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
  <Text
    pl={4} mb={2} mt={6} fontSize="13px" fontWeight="500"
    color="gray.500" textTransform="uppercase" letterSpacing="0.06em"
  >
    {title} {count != null && `(${count})`}
  </Text>
);

/* ─── Product Status Row ─── */
const StatusRow: React.FC<{
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: ProductFetchStatus;
  mainValue?: string;
  message?: string;
  isLast?: boolean;
}> = ({ title, icon, iconBg, iconColor, status, mainValue, message, isLast }) => {
  const text = status === 'loading' ? 'Fetching...'
    : status === 'success' ? (mainValue || '✓ Verified')
    : status === 'pending' ? 'Generating...'
    : (message || 'Not available');

  return (
    <Flex
      align="center" px={4} py={3}
      borderBottom={isLast ? 'none' : '0.5px solid'}
      borderColor={IOS.separator}
    >
      <Flex
        w="32px" h="32px" borderRadius="full"
        bg={iconBg} align="center" justify="center"
        mr={3} flexShrink={0}
      >
        <Text
          fontSize="18px" lineHeight="1" color={iconColor}
          className="material-symbols-outlined"
          sx={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
        >
          {icon}
        </Text>
      </Flex>
      <Text flex="1" fontSize="16px" fontWeight="500" color={IOS.text}>{title}</Text>
      <Flex align="center" gap={2}>
        {status === 'loading' && <Spinner size="sm" color={IOS.primary} thickness="3px" />}
        <Text fontSize="15px" color={status === 'success' ? IOS.text : '#C7C7CC'} fontWeight={status === 'success' ? '600' : '400'}>
          {text}
        </Text>
      </Flex>
    </Flex>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
const KycFinancialLinkScreen: React.FC<KycFinancialLinkScreenProps> = ({
  userId, userEmail, onContinue, onSkip,
}) => {
  const plaid = usePlaidLinkHook(userId, userEmail);

  /* ─── Extract all accounts from balance data ─── */
  const allAccounts = useMemo(() => {
    const balanceAccounts = plaid.financialData?.balance?.data?.accounts || [];
    return balanceAccounts;
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

  /* ─── Total net worth ─── */
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
    // Deduplicate emails and phones (case-insensitive for emails)
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
    const data = plaid.financialData?.investments?.data;
    if (!data) return [];
    return data.holdings || [];
  }, [plaid.financialData]);

  const investmentTotal = useMemo(() => {
    return investmentHoldings.reduce((sum: number, h: any) => sum + (h.institution_value || 0), 0);
  }, [investmentHoldings]);

  /* ─── UI state ─── */
  const headerSubtitle = useMemo(() => {
    if (plaid.step === 'done' && plaid.institution) {
      return `Connected to ${plaid.institution.name}. You can continue to the next step.`;
    }
    return "We'll securely check your financial profile before starting KYC verification.";
  }, [plaid.step, plaid.institution]);

  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);
  const isInitializing = plaid.step === 'idle' || plaid.step === 'creating_token';
  const isDone = plaid.step === 'done';
  const canProceed = isDone && plaid.canProceed;

  const buttonText = useMemo(() => {
    if (plaid.step === 'idle' || plaid.step === 'creating_token') return 'Preparing...';
    if (plaid.step === 'linking') return 'Connecting...';
    if (plaid.step === 'exchanging') return 'Securing connection...';
    if (plaid.step === 'fetching') return 'Fetching financial data...';
    if (isDone && canProceed) return 'Continue to KYC';
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) return 'Try Again';
    return 'Connect Bank Account';
  }, [plaid.step, plaid.canProceed, isDone, canProceed]);

  const handleButtonClick = () => {
    if (isDone && canProceed) {
      const result: FinancialVerificationResult = {
        verified: true,
        productsAvailable: plaid.productsAvailable,
        institutionName: plaid.institution?.name,
        institutionId: plaid.institution?.id,
        balanceAvailable: plaid.balanceStatus === 'success',
        assetsAvailable: plaid.assetsStatus === 'success',
        investmentsAvailable: plaid.investmentsStatus === 'success',
        timestamp: new Date().toISOString(),
      };
      onContinue(result);
      return;
    }
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) { plaid.retry(); return; }
    if (plaid.isReady) plaid.openPlaidLink();
  };

  const groupLabels: Record<string, string> = {
    depository: 'Checking & Savings',
    credit: 'Credit Cards',
    loan: 'Loans & Mortgages',
    investment: 'Investments',
    other: 'Other Accounts',
  };

  return (
    <Box
      className="onboarding-shell"
      minH="calc(100dvh - var(--onboarding-top-space, 7rem))"
      h="calc(100dvh - var(--onboarding-top-space, 7rem))"
      display="flex" flexDirection="column" bg={IOS.bg} fontFamily={IOS.font}
      sx={{ '--onboarding-footer-space': '0px', WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Scrollable content */}
      <Box as="main" flex="1 1 auto" minH={0} overflowY="auto" overflowX="hidden" pb={6} sx={{ WebkitOverflowScrolling: 'touch' }}>

        {/* Header */}
        <Box pt={14} px={5} pb={0} mb={2}>
          <Text as="h1" fontSize="34px" lineHeight="41px" fontWeight="900" letterSpacing="-0.02em" color={IOS.text} mb={3}>
            Financial Verification
          </Text>
          <Text fontSize="17px" lineHeight="22px" color="gray.500" fontWeight="400">
            {headerSubtitle}
          </Text>
        </Box>

        {/* Connected badge */}
        {isDone && plaid.institution && (
          <Box px={5} mt={4} mb={2}>
            <Badge bg="green.50" color="green.600" fontSize="13px" fontWeight="600" px={3} py={1} borderRadius="full" border="1px solid" borderColor="green.200">
              ✓ Connected to {plaid.institution.name}
            </Badge>
          </Box>
        )}

        {/* ═══ ALL ACCOUNTS — grouped by type ═══ */}
        {allAccounts.length > 0 && (
          <Box px={5}>
            {/* Total summary */}
            <SectionHeader title="Total Balance" />
            <Box bg={IOS.listBg} borderRadius="12px" overflow="hidden" border="0.5px solid" borderColor="rgba(0,0,0,0.04)" mb={2}>
              <Flex align="center" px={4} py={4}>
                <Box flex="1">
                  <Text fontSize="13px" color={IOS.secondary} mb={1}>All Accounts ({allAccounts.length})</Text>
                  <Text fontSize="28px" fontWeight="700" color={IOS.text}>{formatCurrency(totalBalance)}</Text>
                </Box>
              </Flex>
            </Box>

            {/* Individual account groups */}
            {Object.entries(accountGroups).map(([type, accounts]) => (
              <Box key={type}>
                <SectionHeader title={groupLabels[type] || type} count={accounts.length} />
                <Box bg={IOS.listBg} borderRadius="12px" overflow="hidden" border="0.5px solid" borderColor="rgba(0,0,0,0.04)">
                  {accounts.map((acc: any, i: number) => (
                    <AccountRow key={acc.account_id || i} account={acc} isLast={i === accounts.length - 1} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* ═══ Investments ═══ */}
        {investmentHoldings.length > 0 && (
          <Box px={5}>
            <SectionHeader title="Investment Holdings" count={investmentHoldings.length} />
            <Box bg={IOS.listBg} borderRadius="12px" overflow="hidden" border="0.5px solid" borderColor="rgba(0,0,0,0.04)">
              {investmentHoldings.map((h: any, i: number) => (
                <Flex key={i} align="center" px={4} py={3} borderBottom={i === investmentHoldings.length - 1 ? 'none' : '0.5px solid'} borderColor={IOS.separator}>
                  <Flex w="36px" h="36px" borderRadius="10px" bg="rgba(0,199,190,0.1)" align="center" justify="center" mr={3}>
                    <Text fontSize="20px" lineHeight="1" color="#00C7BE" className="material-symbols-outlined" sx={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>trending_up</Text>
                  </Flex>
                  <Box flex="1" minW={0}>
                    <Text fontSize="16px" fontWeight="500" color={IOS.text} noOfLines={1}>{h.security_id || `Holding ${i + 1}`}</Text>
                    <Text fontSize="13px" color={IOS.secondary}>{h.quantity} shares</Text>
                  </Box>
                  <Text fontSize="16px" fontWeight="600" color={IOS.text}>{formatCurrency(h.institution_value, h.iso_currency_code || 'USD')}</Text>
                </Flex>
              ))}
              <Flex px={4} py={3} borderTop="0.5px solid" borderColor={IOS.separator}>
                <Text flex="1" fontSize="15px" fontWeight="600" color={IOS.text}>Total Investments</Text>
                <Text fontSize="16px" fontWeight="700" color={IOS.text}>{formatCurrency(investmentTotal)}</Text>
              </Flex>
            </Box>
          </Box>
        )}

        {/* ═══ Identity Data ═══ */}
        {identityInfo && (
          <Box px={5}>
            <SectionHeader title="Bank-Verified Identity" />
            <Box bg={IOS.listBg} borderRadius="12px" overflow="hidden" border="0.5px solid" borderColor="rgba(0,0,0,0.04)">
              {identityInfo.names.length > 0 && (
                <Flex align="center" px={4} py={3} borderBottom="0.5px solid" borderColor={IOS.separator}>
                  <Text fontSize="20px" mr={3} className="material-symbols-outlined" color={IOS.secondary} sx={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>person</Text>
                  <Box flex="1"><Text fontSize="13px" color={IOS.secondary}>Name</Text><Text fontSize="16px" fontWeight="500" color={IOS.text}>{identityInfo.names.join(', ')}</Text></Box>
                </Flex>
              )}
              {identityInfo.emails.length > 0 && (
                <Flex align="center" px={4} py={3} borderBottom="0.5px solid" borderColor={IOS.separator}>
                  <Text fontSize="20px" mr={3} className="material-symbols-outlined" color={IOS.secondary} sx={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>email</Text>
                  <Box flex="1"><Text fontSize="13px" color={IOS.secondary}>Email</Text><Text fontSize="16px" fontWeight="500" color={IOS.text}>{identityInfo.emails.join(', ')}</Text></Box>
                </Flex>
              )}
              {identityInfo.phones.length > 0 && (
                <Flex align="center" px={4} py={3} borderBottom="0.5px solid" borderColor={IOS.separator}>
                  <Text fontSize="20px" mr={3} className="material-symbols-outlined" color={IOS.secondary} sx={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>phone</Text>
                  <Box flex="1"><Text fontSize="13px" color={IOS.secondary}>Phone</Text><Text fontSize="16px" fontWeight="500" color={IOS.text}>{identityInfo.phones.join(', ')}</Text></Box>
                </Flex>
              )}
              {identityInfo.addresses.length > 0 && (
                <Flex align="center" px={4} py={3}>
                  <Text fontSize="20px" mr={3} className="material-symbols-outlined" color={IOS.secondary} sx={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>location_on</Text>
                  <Box flex="1"><Text fontSize="13px" color={IOS.secondary}>Address</Text><Text fontSize="15px" fontWeight="500" color={IOS.text}>{identityInfo.addresses[0]}</Text></Box>
                </Flex>
              )}
            </Box>
          </Box>
        )}

        {/* ═══ Product Status Summary ═══ */}
        <Box px={5}>
          <SectionHeader title="Product Status" />
          <Box bg={IOS.listBg} borderRadius="12px" overflow="hidden" border="0.5px solid" borderColor="rgba(0,0,0,0.04)">
            <StatusRow title="Balance" icon="account_balance_wallet" iconBg="rgba(0,122,255,0.1)" iconColor={IOS.primary} status={plaid.balanceStatus} mainValue={allAccounts.length > 0 ? `${allAccounts.length} accounts` : undefined} message="Not available" />
            <StatusRow title="Assets" icon="finance_mode" iconBg="rgba(52,199,89,0.1)" iconColor={IOS.success} status={plaid.assetsStatus} mainValue={plaid.financialData?.assets?.available ? 'Report generated' : undefined} message={plaid.financialData?.assets?.reason === 'not_supported' ? 'Not supported' : 'Not available'} />
            <StatusRow title="Investments" icon="monitoring" iconBg="rgba(175,82,222,0.1)" iconColor="#AF52DE" status={plaid.investmentsStatus} mainValue={investmentHoldings.length > 0 ? `${investmentHoldings.length} holdings` : undefined} message={plaid.financialData?.investments?.reason === 'not_supported' ? 'Not supported' : 'No investment accounts'} />
            <StatusRow title="Identity" icon="badge" iconBg="rgba(255,149,0,0.1)" iconColor="#FF9500" status={identityInfo ? 'success' : (plaid.step === 'done' ? 'unavailable' : 'idle')} mainValue={identityInfo ? '✓ Verified' : undefined} message="Not available" isLast />
          </Box>
        </Box>

        {/* Error */}
        {plaid.error && plaid.step === 'error' && (
          <Box mx={5} mt={4} p={3} borderRadius="12px" bg="#FEF2F2" border="1px solid #FECACA">
            <Text textAlign="center" fontSize="13px" color={IOS.error} lineHeight="1.5">{plaid.error}</Text>
          </Box>
        )}
      </Box>

      {/* ═══ Bottom action bar — flex child, not absolute ═══ */}
      <Box flexShrink={0} bg="rgba(255,255,255,0.95)" backdropFilter="blur(20px)" sx={{ WebkitBackdropFilter: 'blur(20px)' }} px={5} pt={4} pb={8} borderTop="0.5px solid" borderColor={IOS.separator}>
        <Flex align="center" justify="center" mb={5} gap={1.5} opacity={0.7}>
          <Text fontSize="16px" lineHeight="1" color={IOS.secondary} className="material-symbols-outlined" sx={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>lock</Text>
          <Text fontSize="13px" fontWeight="500" color={IOS.secondary}>Secure 256-bit encryption</Text>
        </Flex>
        <Button
          w="100%" data-onboarding-cta
          bg={canProceed ? IOS.success : IOS.primary} color="white"
          borderRadius="12px" h="52px" fontSize="17px" fontWeight="600"
          isDisabled={isInitializing || isProcessing}
          isLoading={isInitializing || isProcessing}
          loadingText={buttonText}
          _hover={{ bg: canProceed ? '#15803D' : IOS.primaryHover }}
          _active={{ transform: 'scale(0.98)' }}
          _disabled={{ bg: '#CBD5E1', color: '#94A3B8', cursor: 'not-allowed' }}
          transition="all 0.2s" onClick={handleButtonClick} aria-label={buttonText}
        >
          {buttonText}
        </Button>
        <Flex mt={3} justify="center" gap={4}>
          {onSkip && (
            <Button variant="ghost" color={IOS.secondary} fontSize="15px" fontWeight="600" h="auto" py={2} _hover={{ color: IOS.text }} onClick={onSkip} aria-label="Skip for now">
              Skip for now
            </Button>
          )}
          <Button variant="ghost" color={IOS.primary} fontSize="15px" fontWeight="600" h="auto" py={2} onClick={isDone ? plaid.retry : () => plaid.isReady && plaid.openPlaidLink()} aria-label="Connect another account">
            Connect another account
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default KycFinancialLinkScreen;
