import {
  addDays,
  formatLongDate,
  formatTime12,
  parseIsoDate,
  toIsoDate,
  toStartsAt,
} from './date-utils';

describe('date-utils', () => {
  it('round-trips a date without shifting the day (no UTC conversion)', () => {
    const date = new Date(2026, 10, 1, 0, 30);
    expect(toIsoDate(date)).toBe('2026-11-01');
    expect(toIsoDate(parseIsoDate('2026-11-01'))).toBe('2026-11-01');
  });

  it('adds days across a month boundary', () => {
    expect(toIsoDate(addDays(new Date(2026, 10, 28), 5))).toBe('2026-12-03');
  });

  it('formats a long date as "Weekday, D Month"', () => {
    expect(formatLongDate('2026-11-12')).toBe('Thursday, 12 November');
  });

  it.each([
    ['09:00', '9:00 AM'],
    ['11:30', '11:30 AM'],
    ['12:00', '12:00 PM'],
    ['13:30', '1:30 PM'],
    ['17:30', '5:30 PM'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatTime12(input)).toBe(expected);
  });

  it('builds the API start time without a time zone', () => {
    expect(toStartsAt('2026-11-12', '10:30')).toBe('2026-11-12T10:30:00');
  });
});
