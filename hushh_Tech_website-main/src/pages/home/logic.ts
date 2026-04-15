/**
 * Home Page — All Business Logic
 *
 * Contains:
 * - Auth session management (Supabase)
 * - Onboarding status check
 * - Primary CTA determination
 * - Navigation handler
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import config from "../../resources/config/config";
import {
  FINANCIAL_LINK_ROUTE,
  getContinueOnboardingCta,
  hasClearedFinancialLink,
} from "../../services/onboarding/flow";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import { fetchResolvedOnboardingProgress } from "../../services/onboarding/progress";

/* ─── Types ─── */
export interface OnboardingStatus {
  hasProfile: boolean;
  isCompleted: boolean;
  currentStep: number;
  financialLinkStatus: "pending" | "completed" | "skipped";
  loading: boolean;
}

export interface PrimaryCTA {
  text: string;
  action: () => void;
  loading: boolean;
}

export interface HomeLogic {
  session: Session | null;
  primaryCTA: PrimaryCTA;
  onNavigate: (path: string) => void;
}

/* ─── Main Hook ─── */
export const useHomeLogic = (): HomeLogic => {
  const navigate = useNavigate();
  const { session } = useAuthSession();

  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    hasProfile: false,
    isCompleted: false,
    currentStep: 1,
    financialLinkStatus: "pending",
    loading: true,
  });

  /* Check onboarding status when logged in */
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!session?.user?.id || !config.supabaseClient) {
        setOnboardingStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const { data: profile, error: profileError } =
          await config.supabaseClient
            .from("investor_profiles")
            .select("id, user_confirmed")
            .eq("user_id", session.user.id)
            .maybeSingle();

        const onboarding = await fetchResolvedOnboardingProgress(
          config.supabaseClient,
          session.user.id
        );

        setOnboardingStatus({
          hasProfile: !!profile && !profileError,
          isCompleted: onboarding?.is_completed || false,
          currentStep: onboarding?.current_step || 1,
          financialLinkStatus: onboarding?.financial_link_status || "pending",
          loading: false,
        });
      } catch (error) {
        console.error("Error checking user status:", error);
        setOnboardingStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    if (session?.user?.id) {
      checkUserStatus();
    } else {
      setOnboardingStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [session?.user?.id]);

  /* Navigation helper */
  const onNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  /* Dynamic CTA based on auth + onboarding state */
  const getPrimaryCTA = (): PrimaryCTA => {
    if (!session) {
      return {
        text: "Complete Your Hushh Profile",
        action: () => navigate(FINANCIAL_LINK_ROUTE),
        loading: false,
      };
    }

    if (onboardingStatus.loading) {
      return { text: "Loading...", action: () => {}, loading: true };
    }

    if (onboardingStatus.hasProfile || onboardingStatus.isCompleted) {
      return {
        text: "View Your Profile",
        action: () => navigate("/hushh-user-profile"),
        loading: false,
      };
    }

    if (hasClearedFinancialLink(onboardingStatus.financialLinkStatus)) {
      const cta = getContinueOnboardingCta(onboardingStatus.currentStep);
      return {
        text: cta.text,
        action: () => navigate(cta.route),
        loading: false,
      };
    }

    return {
      text: "Complete Your Hushh Profile",
      action: () => navigate(FINANCIAL_LINK_ROUTE),
      loading: false,
    };
  };

  return {
    session,
    primaryCTA: getPrimaryCTA(),
    onNavigate,
  };
};
