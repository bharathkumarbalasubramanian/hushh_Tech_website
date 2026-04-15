/**
 * Login Page — Revamped
 * Apple iOS colors, Playfair Display headings, proper English capitalization.
 * Matches Home + Fund A + Community + Profile design language.
 * Logic stays in logic.ts.
 */
import { Link } from "react-router-dom";
import { useLoginLogic } from "./logic";
import HushhLogo from "../../components/images/Hushhogo.png";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../components/hushh-tech-cta/HushhTechCta";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import HushhTechHeader from "../../components/hushh-tech-header/HushhTechHeader";
import HushhTechFooter from "../../components/hushh-tech-footer/HushhTechFooter";
import AuthBootingScreen from "../../components/auth/AuthBootingScreen";

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function LoginPage() {
  const {
    isLoading,
    isSigningIn,
    oauthError,
    oauthFallbackUrl,
    handleAppleSignIn,
    handleGoogleSignIn,
  } = useLoginLogic();

  if (isLoading) {
    return (
      <AuthBootingScreen
        title="Welcome Back."
        description="Checking your secure sign-in session before we continue."
      />
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      {/* ═══ Common Header ═══ */}
      <HushhTechHeader />

      <main className="px-6 flex-grow max-w-md mx-auto w-full flex flex-col justify-center pb-12">
        {/* ── Logo ── */}
        <section className="flex justify-center pt-16 pb-8">
          <Link to="/">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] flex items-center justify-center overflow-hidden border border-black/5">
              <img
                src={HushhLogo}
                alt="Hushh Logo"
                className="w-14 h-14 object-contain"
              />
            </div>
          </Link>
        </section>

        {/* ── Title ── */}
        <section className="pb-10">
          <h1
            className="text-[2.5rem] leading-[1.1] font-normal text-black tracking-tight text-center font-serif"
            style={playfair}
          >
            Welcome{" "}
            <span className="text-gray-400 italic font-light">Back.</span>
          </h1>
          <p className="text-gray-500 text-sm font-light mt-3 text-center leading-relaxed">
            Secure, private, and smart investing.
          </p>
        </section>

        {/* ── Sign-in Buttons ── */}
        <section className="space-y-3 mb-10">
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
          >
            <FaApple className="text-lg" />
            <span>Continue with Apple</span>
          </HushhTechCta>

          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            <FcGoogle className="text-lg" />
            <span>Continue with Google</span>
          </HushhTechCta>

          {oauthError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{oauthError}</p>
              {oauthFallbackUrl ? (
                <a
                  href={oauthFallbackUrl}
                  className="mt-2 inline-flex font-medium underline underline-offset-2"
                >
                  Continue on the supported sign-in host
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── Sign up link ── */}
        <div className="text-center">
          <p className="text-sm text-gray-500 font-light">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-hushh-blue font-medium underline underline-offset-4 decoration-hushh-blue/30 hover:decoration-hushh-blue transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>

        {/* ── Trust Badges ── */}
        <section className="flex flex-col items-center justify-center text-center gap-2 pt-16 pb-4">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-hushh-blue">
              lock
            </span>
            <span className="text-[10px] text-gray-400 tracking-wide uppercase font-medium">
              256 Bit Encryption
            </span>
          </div>
        </section>

        {/* ── Terms Footer ── */}
        <p className="text-[11px] leading-[16px] text-gray-400 text-center font-light">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
      </main>

      {/* ═══ Common Footer ═══ */}
      <HushhTechFooter />
    </div>
  );
}
