import { describe, expect, it } from 'vitest';
import { getSessionExpiry, isSessionFresh } from './sessionExpiry.ts';

/** Local time; months are 0-based as in Date. */
function at(year: number, month: number, day: number, hours: number, minutes = 0, seconds = 0) {
  return new Date(year, month, day, hours, minutes, seconds).getTime();
}

// 2026-09-28 is a Monday.
const mondayLate = at(2026, 8, 28, 23, 50);
const mondayEarly = at(2026, 8, 28, 0, 1);

describe('getSessionExpiry', () => {
  it('is the midnight after the next day', () => {
    expect(getSessionExpiry(mondayLate)).toBe(at(2026, 8, 30, 0));
    expect(getSessionExpiry(mondayEarly)).toBe(at(2026, 8, 30, 0));
  });

  it('stays at midnight across the switch to summer time', () => {
    // Tests run with TZ=Europe/Berlin (vite.config.ts): clocks go forward on 2026-03-29.
    expect(new Date(at(2026, 2, 30, 12)).getTimezoneOffset()).not.toBe(
      new Date(at(2026, 2, 28, 12)).getTimezoneOffset(),
    );

    const saturdayLate = at(2026, 2, 28, 23, 50);

    expect(getSessionExpiry(saturdayLate)).toBe(at(2026, 2, 30, 0));
  });
});

describe('isSessionFresh', () => {
  it('answered Monday 23:50 — fresh until Tuesday 23:59:59', () => {
    expect(isSessionFresh(mondayLate, at(2026, 8, 29, 23, 0))).toBe(true);
    expect(isSessionFresh(mondayLate, at(2026, 8, 29, 23, 59, 59))).toBe(true);
  });

  it('answered Monday 23:50 — expired at Wednesday 00:00', () => {
    expect(isSessionFresh(mondayLate, at(2026, 8, 30, 0))).toBe(false);
    expect(isSessionFresh(mondayLate, at(2026, 8, 30, 0, 5))).toBe(false);
  });

  it('answered Monday 00:01 — still fresh on Tuesday 23:59', () => {
    expect(isSessionFresh(mondayEarly, at(2026, 8, 29, 23, 59))).toBe(true);
  });
});
