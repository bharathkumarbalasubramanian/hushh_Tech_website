/**
 * Verify Identity — Premium Hushh design
 * Stripe Identity verification flow.
 */
import { useVerifyIdentityLogic } from './logic';
import HushhTechBackHeader from '../../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../../components/hushh-tech-cta/HushhTechCta';

function VerifyIdentityPage() {
  const {
    loading,
    startingVerification,
    onboardingData,
    verificationStatus,
    startVerification,
    skipVerification,
    goBack,
  } = useVerifyIdentityLogic();

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col antialiased selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader onBackClick={goBack} rightLabel="FAQs" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-gray-200 border-t-hushh-blue animate-spin" />
            <p className="text-sm text-gray-500 font-light">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    {
      icon: 'badge',
      label: 'government id',
      desc: 'passport, driver\'s license, or id card',
      verified: verificationStatus.document_verified,
    },
    {
      icon: 'photo_camera',
      label: 'selfie verification',
      desc: 'live selfie matching your id photo',
      verified: verificationStatus.selfie_verified,
    },
    {
      icon: 'mail',
      label: 'email',
      desc: onboardingData?.email?.toLowerCase() || 'your email address',
      verified: verificationStatus.email_verified,
    },
    {
      icon: 'phone_iphone',
      label: 'phone number',
      desc: onboardingData?.phone_country_code && onboardingData?.phone_number
        ? `${onboardingData.phone_country_code} ${onboardingData.phone_number}`
        : 'your phone number',
      verified: verificationStatus.phone_verified,
    },
  ];

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      <HushhTechBackHeader onBackClick={goBack} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-16">
        {/* Title */}
        <section className="py-8">
          <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-4 font-medium">Identity</h3>
          <h1 className="text-[2.75rem] leading-[1.1] font-normal text-black tracking-tight font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Verify Your
            <br />
            <span className="text-gray-400 italic font-light">Identity</span>
          </h1>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed font-light">
            Complete a quick verification to secure your account and unlock all features.
          </p>
        </section>

        {/* Status alerts */}
        {verificationStatus.status === 'processing' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
            </div>
            <p className="text-sm font-medium text-blue-700">Verification in progress. This usually takes a few minutes.</p>
          </div>
        )}
        {verificationStatus.status === 'requires_input' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-yellow-100">
            <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-yellow-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <p className="text-sm font-medium text-yellow-700">Additional information required. Please complete the verification.</p>
          </div>
        )}
        {verificationStatus.status === 'failed' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-red-100">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            </div>
            <p className="text-sm font-medium text-red-700">Verification failed. Please try again or contact support.</p>
          </div>
        )}

        {/* What will be verified */}
        <section className="space-y-0 mb-6">
          <div className="py-4">
            <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-medium">What Will Be Verified</h3>
          </div>
          {items.map((item) => (
            <div key={item.icon} className="py-5 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.verified ? 'bg-ios-green/10 border border-ios-green/20' : 'bg-gray-100'}`}>
                  <span className={`material-symbols-outlined text-lg ${item.verified ? 'text-ios-green' : 'text-gray-700'}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 block">{item.label}</span>
                  <span className="text-xs text-gray-500 font-medium">{item.desc}</span>
                </div>
                {item.verified && (
                  <span className="text-[10px] font-semibold text-ios-green bg-ios-green/10 border border-ios-green/20 px-2 py-0.5 rounded">Verified</span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Security note */}
        <div className="flex items-start gap-3 py-4 px-1 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-gray-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-900 block">Secure & Private</span>
            <p className="text-xs text-gray-500 leading-relaxed font-light mt-0.5">
              Your documents are encrypted and processed securely. We never store raw document images.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <section className="space-y-3 pb-6">
          <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={startVerification} disabled={startingVerification}>
            {startingVerification ? 'Starting...' : verificationStatus.status === 'requires_input' ? 'Continue Verification' : 'Start Verification'}
          </HushhTechCta>
          <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={skipVerification}>
            I'll Do This Later
          </HushhTechCta>
        </section>

        {/* Time estimate + trust */}
        <section className="flex flex-col items-center text-center gap-1 pb-8">
          <span className="text-[10px] text-gray-500 font-light">Usually takes 2-3 minutes to complete</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-[12px] text-hushh-blue">lock</span>
            <span className="text-[10px] text-gray-500 tracking-wide uppercase font-medium">Stripe Identity</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default VerifyIdentityPage;
