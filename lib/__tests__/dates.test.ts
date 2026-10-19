import { describe, expect, it } from 'vitest';
import {
  formatManilaDateTime,
  getManilaDateParts,
  getManilaDateString,
  getManilaDayRange,
} from '../dates';

describe('date utilities (Asia/Manila)', () => {
  it('correctly maps UTC time across midnight to Manila date', () => {
    // 2026-10-19 15:59:00 UTC is 2026-10-19 23:59:00 in Manila (UTC+8)
    const lateUtc = new Date(Date.UTC(2026, 9, 19, 15, 59, 0));
    expect(getManilaDateString(lateUtc)).toBe('2026-10-19');

    // 2026-10-19 16:00:00 UTC is 2026-10-20 00:00:00 in Manila (UTC+8) -> next day in Manila!
    const midnightManilaUtc = new Date(Date.UTC(2026, 9, 19, 16, 0, 0));
    expect(getManilaDateString(midnightManilaUtc)).toBe('2026-10-20');

    const parts = getManilaDateParts(midnightManilaUtc);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(20);
    expect(parts.hour).toBe(0);
  });

  it('calculates the exact UTC day range for a Manila calendar day', () => {
    // For a reference date on 2026-10-19 Manila time:
    const refDate = new Date(Date.UTC(2026, 9, 19, 5, 0, 0)); // 13:00 Manila
    const range = getManilaDayRange(refDate);

    expect(range.dateString).toBe('2026-10-19');
    // Start of 2026-10-19 in Manila is 2026-10-18 16:00:00.000Z
    expect(range.startUtc).toBe('2026-10-18T16:00:00.000Z');
    // End of 2026-10-19 in Manila is 2026-10-19 15:59:59.999Z
    expect(range.endUtc).toBe('2026-10-19T15:59:59.999Z');
  });

  it('formats dates in Manila timezone irrespective of host machine timezone', () => {
    const testDate = new Date(Date.UTC(2026, 9, 19, 16, 30, 0)); // 00:30 on Oct 20 in Manila
    const formatted = formatManilaDateTime(testDate, 'datetime');
    expect(formatted).toContain('Oct 20, 2026');
    expect(formatted).toMatch(/12:30\s*AM/i);
  });
});
