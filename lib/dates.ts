/**
 * Date and timezone utilities for Stokr.
 * Invariant: All day boundaries ("today", reports, dashboard) are calculated in Asia/Manila timezone (UTC+8).
 * Database timestamps are stored in UTC (timestamptz).
 */

export const MANILA_TIMEZONE = 'Asia/Manila';

/**
 * Returns the current date/time components formatted in Asia/Manila.
 */
export function getManilaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  }

  // Note: in 24-hour format, "24" can sometimes appear depending on locale runtime; handle if needed
  let hour = Number.parseInt(partMap.hour, 10);
  if (hour === 24) hour = 0;

  return {
    year: Number.parseInt(partMap.year, 10),
    month: Number.parseInt(partMap.month, 10),
    day: Number.parseInt(partMap.day, 10),
    hour,
    minute: Number.parseInt(partMap.minute, 10),
    second: Number.parseInt(partMap.second, 10),
  };
}

/**
 * Returns the YYYY-MM-DD date string in Asia/Manila for a given date or current time.
 */
export function getManilaDateString(date: Date = new Date()): string {
  const { year, month, day } = getManilaDateParts(date);
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Computes the UTC start and end timestamps representing "today" (or a given date) in Asia/Manila.
 * Since Asia/Manila is fixed at UTC+8:
 * - 00:00:00 Asia/Manila on YYYY-MM-DD is 16:00:00 UTC on the previous calendar day.
 * - 23:59:59.999 Asia/Manila on YYYY-MM-DD is 15:59:59.999 UTC on the same day.
 */
export function getManilaDayRange(referenceDate: Date = new Date()): {
  dateString: string;
  startUtc: string;
  endUtc: string;
  startUtcDate: Date;
  endUtcDate: Date;
} {
  const dateString = getManilaDateString(referenceDate);
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1; // 0-indexed
  const day = Number.parseInt(dayStr, 10);

  // Midnight Asia/Manila corresponds to 16:00 UTC previous day (UTC - 8h)
  const startUtcDate = new Date(Date.UTC(year, month, day - 1, 16, 0, 0, 0));
  // 23:59:59.999 Asia/Manila corresponds to 15:59:59.999 UTC
  const endUtcDate = new Date(Date.UTC(year, month, day, 15, 59, 59, 999));

  return {
    dateString,
    startUtc: startUtcDate.toISOString(),
    endUtc: endUtcDate.toISOString(),
    startUtcDate,
    endUtcDate,
  };
}

/**
 * Formats a timestamp into a human-friendly string in Asia/Manila.
 */
export function formatManilaDateTime(
  dateInput: Date | string,
  style: 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  if (style === 'date') {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: MANILA_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  if (style === 'time') {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: MANILA_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
