import { describe, expect, it } from 'vitest';

import {
  MINIMUM_ONBOARDING_AGE,
  buildDobYearOptions,
  resolveDobEligibility,
} from '../src/pages/onboarding/step-6/logic';

describe('step 6 DOB age gate', () => {
  const today = new Date('2026-04-09T12:00:00.000Z');

  it('limits year options to adult-eligible years', () => {
    const yearOptions = buildDobYearOptions(today);

    expect(yearOptions[0]).toBe('2008');
    expect(yearOptions).not.toContain('2009');
    expect(yearOptions.at(-1)).toBe('1930');
  });

  it('allows a user who turns 18 today', () => {
    expect(resolveDobEligibility('04', '09', '2008', today)).toEqual({
      isComplete: true,
      isValidDate: true,
      isAdult: true,
      ageError: null,
    });
  });

  it('blocks a user who is still younger than 18', () => {
    expect(resolveDobEligibility('04', '10', '2008', today)).toEqual({
      isComplete: true,
      isValidDate: true,
      isAdult: false,
      ageError: `You must be at least ${MINIMUM_ONBOARDING_AGE} years old to continue`,
    });
  });

  it('rejects invalid calendar dates before enabling continue', () => {
    expect(resolveDobEligibility('02', '31', '2000', today)).toEqual({
      isComplete: true,
      isValidDate: false,
      isAdult: false,
      ageError: null,
    });
  });
});
