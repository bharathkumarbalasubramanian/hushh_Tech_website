/**
 * Verify Complete — Premium Hushh design
 * Shows verification result states: loading, verified, processing, requires_input, failed.
 */
import { useVerifyCompleteLogic } from './logic';
import HushhTechBackHeader from '../../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../../components/hushh-tech-cta/HushhTechCta';

function VerifyCompletePage() {
  const {
    result,
    pollingCount,
    handleContinue,
    handleRetry,
  } = useVerifyCompleteLogic();

  /** Icon + color per state */
  const stateConfig: Record<string, { icon: string; bg: string; border: string; iconColor: string; title: string; desc: string }> = {
    loading: {
      icon: 'sync', bg: 'bg-gray-100', border: '', iconColor: 'text-gray-500',
      title: 'Checking Status...', desc: 'Please wait while we confirm your verification.',
    },
    verified: {
      icon: 'check_circle', bg: 'bg-ios-green/10', border: 'border border-ios-green/20', iconColor: 'text-ios-green',
      title: 'Verification Complete', desc: 'Your identity has been verified successfully. You now have full access to all features.',
    },
    processing: {
      icon: 'schedule', bg: 'bg-blue-50', border: 'border border-blue-200', iconColor: 'text-blue-600',
      title: 'Verification in Progress', desc: 'Your verification is being processed. This usually takes just a few moments.',
    },
    requires_input: {
      icon: 'warning', bg: 'bg-yellow-50', border: 'border border-yellow-200', iconColor: 'text-yellow-600',
      title: 'Additional Info Needed', desc: 'We need some additional information to complete your verification. Please try again.',
    },
    failed: {
      icon: 'error', bg: 'bg-red-50', border: 'border border-red-200', iconColor: 'text-red-500',
      title: 'Verification Failed', desc: 'We couldn\'t verify your identity. This could be due to unclear images or mismatched information.',
    },
  };

  const cfg = stateConfig[result] || stateConfig.loading;

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      <HushhTechBackHeader onBackClick={handleContinue} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full flex flex-col items-center justify-center text-center pb-16">
        {/* Status icon */}
        <div className={`w-20 h-20 rounded-full ${cfg.bg} ${cfg.border} flex items-center justify-center mb-6 ${result === 'loading' ? 'animate-spin' : ''}`}>
          <span
            className={`material-symbols-outlined text-[40px] ${cfg.iconColor}`}
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
          >
            {cfg.icon}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-normal text-black tracking-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {cfg.title}
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs mb-8">
          {cfg.desc}
        </p>

        {/* Processing progress */}
        {result === 'processing' && (
          <div className="w-full max-w-xs mb-8">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-hushh-blue rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-gray-400 lowercase font-medium">
              {pollingCount < 10 ? 'Checking status...' : 'Taking longer than expected'}
            </p>
          </div>
        )}

        {/* CTAs per state */}
        <div className="w-full space-y-3">
          {result === 'verified' && (
            <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleContinue}>
              Continue to Profile
            </HushhTechCta>
          )}

          {result === 'processing' && (
            <>
              <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={handleContinue}>
                Continue Anyway
              </HushhTechCta>
              <p className="text-[10px] text-gray-400 font-light">You'll be notified when verification is complete.</p>
            </>
          )}

          {result === 'requires_input' && (
            <>
              <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleRetry}>
                Try Again
              </HushhTechCta>
              <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={handleContinue}>
                I'll Do This Later
              </HushhTechCta>
            </>
          )}

          {result === 'failed' && (
            <>
              <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleRetry}>
                Try Again
              </HushhTechCta>
              <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={handleContinue}>
                Continue Without Verification
              </HushhTechCta>
              <p className="text-[10px] text-gray-400 font-light">Need help? Contact support@hushh.ai</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default VerifyCompletePage;
