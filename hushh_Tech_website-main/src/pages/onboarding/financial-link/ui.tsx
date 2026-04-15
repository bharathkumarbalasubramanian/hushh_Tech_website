/**
 * FinancialLink — UI / Presentation
 * Same design language as step 1-8.
 * Plaid integration restored via logic.ts (usePlaidLinkHook).
 * Continue → opens Plaid Link → fetches data → proceeds to step 1.
 */
import { useNavigate } from "react-router-dom";
import { useFinancialLinkLogic, formatCurrency } from "./logic";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../../components/hushh-tech-cta/HushhTechCta";
import HushhTechBackHeader from "../../../components/hushh-tech-back-header/HushhTechBackHeader";

export default function OnboardingFinancialLink() {
  const navigate = useNavigate();
  const {
    userId,
    isReady,
    /* Plaid state */
    plaidStep,
    institution,
    isDone,
    canProceed,
    isProcessing,
    isButtonDisabled,
    buttonText,
    error,
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
    openPlaidLink,
    retry,
  } = useFinancialLinkLogic();

  /* Loading state */
  if (!isReady || !userId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-hushh-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 text-center">
            Preparing your secure onboarding...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      {/* Header — back + FAQs */}
      <HushhTechBackHeader
        onBackClick={() => navigate(-1)}
        rightLabel="FAQs"
      />

      {/* Main Content */}
      <main className="px-6 mt-8 flex-grow max-w-md mx-auto w-full pb-48">
        {/* Title Section */}
        <section className="space-y-6 mb-12">
          <h2
            className="text-[36px] leading-[1.2] text-gray-900 font-serif"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Verify Your
            <br />
            <span className="text-gray-400 italic font-light">Financial Profile.</span>
          </h2>
          <p className="text-gray-400 text-[14px] leading-relaxed max-w-[90%] font-light">
            {isDone && institution
              ? `Connected to ${institution.name}. You can continue to the next step.`
              : "We'll securely check your financial profile before starting KYC verification to ensure compliance."}
          </p>
        </section>

        {/* Connected Badge */}
        {isDone && institution && (
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ios-green/10 border border-ios-green/20 rounded-full text-xs font-semibold text-gray-900">
              <span className="material-symbols-outlined text-sm text-ios-green" style={{ fontVariationSettings: "'wght' 400" }}>check_circle</span>
              Connected to {institution.name}
            </span>
          </div>
        )}

        {/* ── Accounts Summary (shown after Plaid connects) ── */}
        {allAccounts.length > 0 && (
          <section className="mb-8">
            <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-3 font-medium">
              Total Balance
            </h3>
            <div className="border border-gray-200 px-4 py-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">
                All Accounts ({allAccounts.length})
              </p>
              <p className="text-2xl font-bold text-black font-mono">
                {formatCurrency(totalBalance)}
              </p>
            </div>

            {/* Account groups */}
            {Object.entries(accountGroups).map(([type, accounts]) => (
              <div key={type} className="mb-4">
                <h4 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-2 font-medium">
                  {type === 'depository' ? 'Checking & Savings' : type === 'credit' ? 'Credit Cards' : type}
                  {' '}({(accounts as any[]).length})
                </h4>
                <div className="border border-gray-200 divide-y divide-gray-100">
                  {(accounts as any[]).map((acc: any, i: number) => {
                    const balance = acc.balances?.current ?? acc.balances?.available;
                    const currency = acc.balances?.iso_currency_code || 'USD';
                    return (
                      <div key={acc.account_id || i} className="flex items-center px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mr-3">
                          <span
                            className="material-symbols-outlined text-gray-700 text-lg"
                            style={{ fontVariationSettings: "'wght' 300" }}
                          >
                            account_balance
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {acc.name || `account ...${acc.mask}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {acc.subtype || acc.type} {acc.mask ? `···${acc.mask}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-black font-mono shrink-0 ml-2">
                          {balance != null ? formatCurrency(balance, currency) : '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Identity Data (shown after Plaid connects) ── */}
        {identityInfo && (
          <section className="mb-8">
            <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-3 font-medium">
              Bank-Verified Identity
            </h3>
            <div className="border border-gray-200 divide-y divide-gray-100">
              {identityInfo.names.length > 0 && (
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-lg" style={{ fontVariationSettings: "'wght' 300" }}>person</span>
                  <div><p className="text-xs text-gray-500">Name</p><p className="text-sm font-medium text-black">{identityInfo.names.join(', ')}</p></div>
                </div>
              )}
              {identityInfo.emails.length > 0 && (
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-lg" style={{ fontVariationSettings: "'wght' 300" }}>email</span>
                  <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-medium text-black">{identityInfo.emails.join(', ')}</p></div>
                </div>
              )}
              {identityInfo.phones.length > 0 && (
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-lg" style={{ fontVariationSettings: "'wght' 300" }}>phone</span>
                  <div><p className="text-xs text-gray-500">Phone</p><p className="text-sm font-medium text-black">{identityInfo.phones.join(', ')}</p></div>
                </div>
              )}
              {identityInfo.addresses.length > 0 && (
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-lg" style={{ fontVariationSettings: "'wght' 300" }}>location_on</span>
                  <div><p className="text-xs text-gray-500">Address</p><p className="text-sm font-medium text-black">{identityInfo.addresses[0]}</p></div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Verification Rows (product status) ── */}
        <section className="space-y-0 border-t border-gray-100">
          {verificationRows.map((row) => (
            <div
              key={row.title}
              className="group py-6 border-b border-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-gray-800 text-[20px]"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    {row.icon}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 text-[15px]">
                    {row.title}
                  </span>
                  <span className={`text-[13px] font-light ${
                    row.status === 'success' ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}>
                    {row.status === 'loading' && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 border border-hushh-blue border-t-transparent rounded-full animate-spin inline-block" />
                        {row.subtitle}
                      </span>
                    )}
                    {row.status !== 'loading' && row.subtitle}
                  </span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-[20px] ${row.status === 'success' ? 'text-ios-green' : 'text-gray-400'}`}
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                {row.status === 'success' ? 'check_circle' : 'east'}
              </span>
            </div>
          ))}
        </section>

        {/* Error message */}
        {error && plaidStep === 'error' && (
          <div className="mt-4 p-3 border border-red-200 bg-red-50 text-center">
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Trust Badges */}
        <section className="mt-auto py-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex items-center gap-3 opacity-60">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
              PCI DSS
            </span>
            <span className="text-[10px] text-gray-400 uppercase">
              256 Bit Encryption
            </span>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
              <div className="flex -space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              </div>
              <span className="text-[10px] font-bold text-blue-800 italic font-serif">
                Visa
              </span>
              <span className="text-[10px] font-bold text-teal-600">
                RuPay
              </span>
            </div>
          </div>
        </section>

        {/* CTAs — Connect/Continue & Skip */}
        <section className="pb-12 space-y-3">
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={handleButtonClick}
            disabled={isButtonDisabled}
          >
            {isButtonDisabled && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
            )}
            {buttonText}
          </HushhTechCta>

          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={handleSkip}
          >
            Skip
          </HushhTechCta>
        </section>
      </main>
    </div>
  );
}
