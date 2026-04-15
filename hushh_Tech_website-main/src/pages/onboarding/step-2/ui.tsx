/**
 * Step 2 — Referral Source Selection
 * Clean card-based survey. Logic stays in logic.ts.
 * Uses HushhTechBackHeader + HushhTechCta reusable components.
 */
import {
  useStep2Logic,
  REFERRAL_OPTIONS,
  CURRENT_STEP,
  TOTAL_STEPS,
  PROGRESS_PCT,
} from "./logic";
import HushhTechBackHeader from "../../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../../components/hushh-tech-cta/HushhTechCta";

/** Material icon override per option for design consistency */
const ICON_MAP: Record<string, string> = {
  social_media_ad: "smartphone",
  family_friend: "groups",
  podcast: "mic",
  website_blog_article: "newspaper",
  ai_tool: "support_agent",
  other: "more_horiz",
};

export default function OnboardingStep2() {
  const {
    selectedSource,
    isLoading,
    setSelectedSource,
    handleContinue,
    handleSkip,
    handleBack,
  } = useStep2Logic();

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      {/* ═══ Header ═══ */}
      <HushhTechBackHeader onBackClick={handleBack} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">
        {/* ── Progress Bar ── */}
        <div className="py-4">
          <div className="flex justify-between text-[11px] font-semibold tracking-wide text-gray-500 mb-3">
            <span>
              Step {CURRENT_STEP}/{TOTAL_STEPS}
            </span>
            <span>{PROGRESS_PCT}% Complete</span>
          </div>
          <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-hushh-blue transition-all duration-500"
              style={{ width: `${PROGRESS_PCT}%` }}
            />
          </div>
        </div>

        {/* ── Title ── */}
        <section className="py-8">
          <h1
            className="text-[2.25rem] leading-[1.15] font-medium text-black tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            How did you hear about Hushh Fund&nbsp;A?
          </h1>
        </section>

        {/* ── Survey Cards ── */}
        <section className="space-y-3 mb-16">
          {REFERRAL_OPTIONS.map((option) => {
            const isSelected = selectedSource === option.value;
            const icon = ICON_MAP[option.value] || option.icon;

            return (
              <button
                key={option.value}
                onClick={() => setSelectedSource(option.value)}
                className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 border ${
                  isSelected
                    ? "border-hushh-blue bg-hushh-blue/5 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
                aria-label={option.label}
                tabIndex={0}
              >
                {/* Icon circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-hushh-blue text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'wght' 300" }}
                  >
                    {icon}
                  </span>
                </div>

                {/* Label */}
                <span
                  className={`text-base font-semibold transition-colors ${
                    isSelected ? "text-black" : "text-gray-700"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </section>

        {/* ── CTAs — Continue & Skip ── */}
        <section className="pb-12 space-y-3">
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={handleContinue}
            disabled={!selectedSource || isLoading}
          >
            {isLoading ? "Saving..." : "Continue"}
          </HushhTechCta>

          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={handleSkip}
          >
            Skip for now
          </HushhTechCta>
        </section>
      </main>
    </div>
  );
}
