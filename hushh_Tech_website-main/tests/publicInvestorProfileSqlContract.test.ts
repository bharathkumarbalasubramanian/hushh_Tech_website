import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const secureRpcMigrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260409183000_secure_public_investor_profile_rpc.sql"
);
const relaxedPublicSlugMigrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260410120000_expand_public_profile_rpc_for_unconfirmed_slugs.sql"
);
const secureRpcMigrationSql = readFileSync(secureRpcMigrationPath, "utf8");
const relaxedPublicSlugMigrationSql = readFileSync(
  relaxedPublicSlugMigrationPath,
  "utf8"
);

describe("public investor profile SQL contract", () => {
  it("adds a secure projection RPC and removes anon raw-table reads", () => {
    expect(secureRpcMigrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.get_public_investor_profile"
    );
    expect(secureRpcMigrationSql).toContain(
      "REVOKE SELECT ON public.investor_profiles FROM anon;"
    );
    expect(secureRpcMigrationSql).toContain(
      "REVOKE SELECT ON public.onboarding_data FROM anon;"
    );
    expect(secureRpcMigrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_public_investor_profile(text) TO anon;"
    );
  });

  it("keeps sensitive onboarding fields out of the public payload projection", () => {
    expect(secureRpcMigrationSql).not.toContain("ssn_encrypted");
    expect(secureRpcMigrationSql).not.toContain("bank_account_number_encrypted");
    expect(secureRpcMigrationSql).not.toContain("gps_latitude");
    expect(secureRpcMigrationSql).not.toContain("nda_pdf_url");
    expect(secureRpcMigrationSql).not.toContain("'date_of_birth'");
  });

  it("allows public slugs before confirmation while marking richer projections as confirmed-only", () => {
    expect(relaxedPublicSlugMigrationSql).toContain(
      "'is_confirmed', COALESCE(profile_row.user_confirmed, false)"
    );
    expect(relaxedPublicSlugMigrationSql).not.toContain("AND user_confirmed = true");
    expect(relaxedPublicSlugMigrationSql).toContain(
      "WHEN profile_row.user_confirmed AND filtered_investor_profile <> '{}'::jsonb THEN filtered_investor_profile"
    );
    expect(relaxedPublicSlugMigrationSql).toContain(
      "WHEN profile_row.user_confirmed AND filtered_onboarding_data <> '{}'::jsonb THEN filtered_onboarding_data"
    );
  });
});
