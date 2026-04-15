/**
 * DEPRECATED: This test file previously tested useStep4Logic and getTrustedStep4Countries,
 * which were part of the old step-4 (country/location detection).
 *
 * After merging the country + address steps into the combined step-3,
 * those exports no longer exist. The combined location logic is now
 * covered by tests/step6LocationFlow.test.ts.
 *
 * This file is intentionally left empty to avoid import errors.
 */
import { describe, it } from 'vitest';

describe('Step 4 location refresh logic (deprecated)', () => {
  it.skip('tests moved to combined step-3 logic — see step6LocationFlow.test.ts', () => {});
});
