#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

import { buildOnboardingAddressRepairPatch } from '../src/services/location/addressNormalization.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const userIdArg = args.find((arg) => arg.startsWith('--user-id='));
const limit = Number(limitArg?.split('=')[1] || 200);
const userId = userIdArg?.split('=')[1] || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

if (!Number.isFinite(limit) || limit <= 0) {
  console.error('`--limit` must be a positive number.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const selectFields = `
  id,
  user_id,
  address_line_1,
  address_line_2,
  city,
  state,
  zip_code,
  address_country,
  gps_full_address,
  gps_city,
  gps_state,
  gps_country,
  gps_zip_code
`;

async function main() {
  let query = supabase
    .from('onboarding_data')
    .select(selectFields)
    .or('gps_country.not.is.null,gps_full_address.not.is.null,gps_city.not.is.null,gps_state.not.is.null,gps_zip_code.not.is.null')
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to read onboarding_data:', error.message);
    process.exit(1);
  }

  const rows = data || [];
  let candidateCount = 0;
  let updatedCount = 0;

  console.log(`${apply ? 'Applying' : 'Dry-run'} onboarding address repair over ${rows.length} row(s).`);

  for (const row of rows) {
    const patch = buildOnboardingAddressRepairPatch(row);
    if (!patch) continue;

    candidateCount += 1;
    console.log(`\n[user ${row.user_id}] patch`, patch);

    if (!apply) continue;

    const { error: updateError } = await supabase
      .from('onboarding_data')
      .update(patch)
      .eq('id', row.id);

    if (updateError) {
      console.error(`[user ${row.user_id}] update failed:`, updateError.message);
      continue;
    }

    updatedCount += 1;
  }

  console.log('\nSummary');
  console.log(`- Candidate rows: ${candidateCount}`);
  console.log(`- Updated rows: ${updatedCount}`);
  console.log(`- Mode: ${apply ? 'apply' : 'dry-run'}`);
}

main().catch((error) => {
  console.error('Unexpected failure running onboarding address backfill:', error);
  process.exit(1);
});
