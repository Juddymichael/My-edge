/**
 * Month names and abbreviations dictionary for multilingual statement parsing (FR/EN/ES/DE).
 */
const MONTH_NAME_MAP: Record<string, string> = {
  // French
  janv: '01',
  jan: '01',
  janvier: '01',
  fevr: '02',
  fev: '02',
  fevrier: '02',
  févr: '02',
  fév: '02',
  février: '02',
  mars: '03',
  mar: '03',
  avr: '04',
  avril: '04',
  mai: '05',
  juin: '06',
  jun: '06',
  juil: '07',
  juill: '07',
  juillet: '07',
  jul: '07',
  aou: '08',
  aout: '08',
  aoû: '08',
  août: '08',
  aug: '08',
  august: '08',
  sept: '09',
  sep: '09',
  septembre: '09',
  oct: '10',
  octo: '10',
  octobre: '10',
  nov: '11',
  novembre: '11',
  dec: '12',
  déc: '12',
  decembre: '12',
  décembre: '12',
  // English / German / Spanish additions
  apr: '04',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  dez: '12',
  okt: '10',
};

/**
 * Date Normalization to unambiguous ISO 8601 strings.
 * Handles formats like:
 * - "18 Aoû 2026 10:34:23.404" (cTrader / French exports)
 * - "2026.08.18 10:34:23" (MT4/MT5)
 * - "18/08/2026 10:34:23"
 * - ISO strings and epoch timestamps.
 */
export function normalizeDate(rawDate: unknown, fallbackTimezone = 'UTC'): string {
  if (rawDate === null || rawDate === undefined) {
    throw new Error('Cannot normalize null or undefined date');
  }

  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) {
      throw new Error('Invalid Date instance');
    }
    return rawDate.toISOString();
  }

  if (typeof rawDate === 'number') {
    // Check if timestamp is in seconds (10 digits) vs milliseconds (13 digits)
    const timestamp = rawDate < 10000000000 ? rawDate * 1000 : rawDate;
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid numeric timestamp: ${rawDate}`);
    }
    return d.toISOString();
  }

  if (typeof rawDate === 'string') {
    let trimmed = rawDate.trim();
    if (!trimmed) {
      throw new Error('Empty date string');
    }

    // Strip timezone annotation if present in parentheses e.g. "(UTC+3)"
    trimmed = trimmed.replace(/\(UTC[+-]?\d*\)/gi, '').trim();

    // 1. Check for text month pattern: "18 Aoû 2026 10:34:23.404" or "18-Aug-2026 10:34:23"
    const textMonthMatch = trimmed.match(
      /^(\d{1,2})[\s\.\-\/]+([a-zA-Z\u00C0-\u017F]+)[\s\.\-\/]+(\d{4})(?:[\s,]+(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?)?/i
    );

    if (textMonthMatch) {
      const [_, day, monthRaw, year, hours = '0', minutes = '0', seconds = '0', ms = '0'] = textMonthMatch;
      const cleanMonthKey = monthRaw.toLowerCase().replace(/[\.]/g, '');
      const monthNum = MONTH_NAME_MAP[cleanMonthKey];

      if (monthNum) {
        const msFormatted = ms ? ms.padEnd(3, '0').slice(0, 3) : '000';
        const isoCandidate = `${year}-${monthNum}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.${msFormatted}Z`;
        const parsed = new Date(isoCandidate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }

    // 2. Pattern: YYYY.MM.DD or YYYY/MM/DD or YYYY-MM-DD
    const ymdMatch = trimmed.match(
      /^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?)?/
    );
    if (ymdMatch) {
      const [_, year, month, day, hours = '0', minutes = '0', seconds = '0', ms = '0'] = ymdMatch;
      const msFormatted = ms ? ms.padEnd(3, '0').slice(0, 3) : '000';
      const isoCandidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.${msFormatted}Z`;
      const parsed = new Date(isoCandidate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    // 3. Pattern: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(
      /^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?)?/
    );
    if (dmyMatch) {
      const [_, day, month, year, hours = '0', minutes = '0', seconds = '0', ms = '0'] = dmyMatch;
      const msFormatted = ms ? ms.padEnd(3, '0').slice(0, 3) : '000';
      const isoCandidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.${msFormatted}Z`;
      const parsed = new Date(isoCandidate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    // 4. Try direct ISO parse as fallback
    const directParse = new Date(trimmed);
    if (!isNaN(directParse.getTime())) {
      return directParse.toISOString();
    }
  }

  throw new Error(`Unable to normalize date: "${String(rawDate)}" (Timezone: ${fallbackTimezone})`);
}

