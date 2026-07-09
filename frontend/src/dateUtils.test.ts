import { formatDateForDisplay, formatDateString, todayDateString } from './dateUtils';

describe('formatDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateString(new Date(2026, 6, 9))).toBe('2026-07-09');
  });

  it('pads single-digit months and days', () => {
    expect(formatDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('todayDateString', () => {
  it('matches formatDateString(new Date())', () => {
    expect(todayDateString()).toBe(formatDateString(new Date()));
  });
});

describe('formatDateForDisplay', () => {
  it('formats a date string as "D Mon"', () => {
    expect(formatDateForDisplay('2026-07-09')).toBe('9 Jul');
    expect(formatDateForDisplay('2026-01-05')).toBe('5 Jan');
  });
});
