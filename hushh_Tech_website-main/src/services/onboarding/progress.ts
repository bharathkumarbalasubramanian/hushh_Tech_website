import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeFinancialLinkStatus,
  resolveFinancialLinkStatus,
  type FinancialLinkStatus,
} from "./flow";

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

export interface OnboardingProgressRecord {
  current_step: number | null;
  is_completed: boolean;
  financial_link_status: FinancialLinkStatus;
}

const isMissingFinancialLinkStatusColumn = (error: PostgrestErrorLike | null | undefined) =>
  error?.code === "PGRST204" &&
  typeof error.message === "string" &&
  error.message.includes("financial_link_status");

export async function fetchOnboardingProgress(
  client: SupabaseClient,
  userId: string
): Promise<OnboardingProgressRecord | null> {
  const primaryQuery = await client
    .from("onboarding_data")
    .select("current_step, is_completed, financial_link_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!primaryQuery.error) {
    if (!primaryQuery.data) {
      return null;
    }

    return {
      current_step:
        typeof primaryQuery.data.current_step === "number"
          ? primaryQuery.data.current_step
          : Number(primaryQuery.data.current_step || 0) || 1,
      is_completed: Boolean(primaryQuery.data.is_completed),
      financial_link_status: normalizeFinancialLinkStatus(
        primaryQuery.data.financial_link_status
      ),
    };
  }

  if (!isMissingFinancialLinkStatusColumn(primaryQuery.error)) {
    throw primaryQuery.error;
  }

  const fallbackQuery = await client
    .from("onboarding_data")
    .select("current_step, is_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackQuery.error) {
    throw fallbackQuery.error;
  }

  if (!fallbackQuery.data) {
    return null;
  }

  return {
    current_step:
      typeof fallbackQuery.data.current_step === "number"
        ? fallbackQuery.data.current_step
        : Number(fallbackQuery.data.current_step || 0) || 1,
    is_completed: Boolean(fallbackQuery.data.is_completed),
    financial_link_status: "pending",
  };
}

export async function fetchResolvedOnboardingProgress(
  client: SupabaseClient,
  userId: string
): Promise<OnboardingProgressRecord | null> {
  const onboardingProgress = await fetchOnboardingProgress(client, userId);
  const { data: financialData, error } = await client
    .from("user_financial_data")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[onboarding.progress] Unable to read financial-link status fallback:",
      error.message
    );
  }

  const resolvedFinancialLinkStatus = resolveFinancialLinkStatus(
    onboardingProgress?.financial_link_status,
    financialData?.status
  );

  if (onboardingProgress) {
    return {
      ...onboardingProgress,
      financial_link_status: resolvedFinancialLinkStatus,
    };
  }

  if (resolvedFinancialLinkStatus !== "pending") {
    return {
      current_step: 1,
      is_completed: false,
      financial_link_status: resolvedFinancialLinkStatus,
    };
  }

  return null;
}
