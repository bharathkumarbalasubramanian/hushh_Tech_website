/**
 * Delete Account Page — Revamped
 * Apple iOS colors, Playfair Display heading, proper English capitalization.
 * Matches Home + Fund A + Community + Profile design language.
 * Logic stays in logic.ts — zero logic changes.
 */
import React, { useState } from "react";
import { useDeleteAccountLogic } from "./logic";
import HushhTechHeader from "../../components/hushh-tech-header/HushhTechHeader";
import HushhTechFooter from "../../components/hushh-tech-footer/HushhTechFooter";
import HushhTechCta, { HushhTechCtaVariant } from "../../components/hushh-tech-cta/HushhTechCta";
import DeleteAccountModal from "../../components/DeleteAccountModal";
import { Helmet } from "react-helmet";
import { DELETE_ACCOUNT_ACCORDION_SECTIONS } from "./content";

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

const DeleteAccountPage: React.FC = () => {
  const {
    isOpen,
    onOpen,
    onClose,
    isLoggedIn,
    isLoading,
    userEmail,
    handleAccountDeleted,
    handleLoginRedirect,
  } = useDeleteAccountLogic();

  /* Accordion expand/collapse state */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <Helmet>
        <title>Delete Account - Hushh</title>
        <meta
          name="description"
          content="Delete your Hushh account and remove all your personal data from our systems."
        />
      </Helmet>

      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white relative overflow-hidden">
        {/* ═══ Background layer (blurs when modal is open) ═══ */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            isOpen
              ? "scale-[0.98] blur-[2px] opacity-40 pointer-events-none select-none"
              : ""
          }`}
        >
          {/* ═══ Common Header ═══ */}
          <HushhTechHeader />

          <main className="flex-1 px-6 pt-8 pb-12 flex flex-col max-w-lg mx-auto w-full">
            {/* ── Title Section ── */}
            <div className="mb-12">
              <h1
                className="text-4xl text-black mb-3 leading-tight font-serif font-normal"
                style={playfair}
              >
                {isLoading
                  ? "Checking Session..."
                  : isLoggedIn
                  ? <>Ready to Delete Your{" "}<span className="text-gray-400 italic font-light">Account?</span></>
                  : <>Login to Delete Your{" "}<span className="text-gray-400 italic font-light">Account.</span></>}
              </h1>

              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-hushh-blue rounded-full" />
                  <p className="text-gray-500 text-sm">
                    Verifying session...
                  </p>
                </div>
              ) : isLoggedIn && userEmail ? (
                <p className="text-gray-500 text-sm font-light">
                  Logged in as: {userEmail}
                </p>
              ) : (
                <p className="text-gray-500 text-sm font-light">
                  Please login to proceed with account deletion.
                </p>
              )}
            </div>

            {/* ── Primary CTA ── */}
            <div className="mb-16">
              {isLoggedIn ? (
                <HushhTechCta
                  variant={HushhTechCtaVariant.BLACK}
                  onClick={onOpen}
                >
                  Permanently Delete Account
                </HushhTechCta>
              ) : (
                <HushhTechCta
                  variant={HushhTechCtaVariant.BLACK}
                  onClick={handleLoginRedirect}
                >
                  Login to Continue
                </HushhTechCta>
              )}
            </div>

            {/* ── Accordion Sections ── */}
            <div className="space-y-0">
              {DELETE_ACCOUNT_ACCORDION_SECTIONS.map((section) => {
                const isExpanded = expandedId === section.id;

                return (
                  <div key={section.id}>
                    {/* Row trigger */}
                    <button
                      type="button"
                      onClick={() => handleToggle(section.id)}
                      className="group w-full py-5 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors -mx-2 px-2"
                      aria-expanded={isExpanded}
                      aria-controls={`accordion-${section.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:border-gray-200 border border-transparent transition-all shrink-0">
                          <span
                            className={`material-symbols-outlined ${section.iconColor} text-[1.25rem]`}
                            style={{
                              fontVariationSettings:
                                "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                            }}
                          >
                            {section.icon}
                          </span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-black">
                            {section.title}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5 font-light">
                            {section.subtitle}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined text-gray-400 text-xl transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        arrow_forward
                      </span>
                    </button>

                    {/* Expandable content */}
                    <div
                      id={`accordion-${section.id}`}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="py-4 pl-16 pr-4 space-y-3 border-b border-gray-100">
                        {section.content.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3"
                          >
                            <span className="text-xs text-gray-400 font-semibold w-4 shrink-0 pt-0.5">
                              {item.step}
                            </span>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Spacer ── */}
            <div className="flex-grow min-h-[4rem]" />

            {/* ── Trust Badge ── */}
            <div className="mt-auto pt-8 flex items-center justify-center gap-2 opacity-60">
              <span
                className="material-symbols-outlined text-[1.2rem] text-hushh-blue"
                style={{
                  fontVariationSettings:
                    "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                }}
              >
                lock
              </span>
              <span className="text-[0.65rem] text-gray-500 tracking-wide font-medium uppercase">
                256 Bit Encryption
              </span>
            </div>
          </main>

          {/* ═══ Common Footer ═══ */}
          <HushhTechFooter />
        </div>

        {/* ═══ Delete Account Modal ═══ */}
        <DeleteAccountModal
          isOpen={isOpen}
          onClose={onClose}
          onAccountDeleted={handleAccountDeleted}
        />
      </div>
    </>
  );
};

export default DeleteAccountPage;
