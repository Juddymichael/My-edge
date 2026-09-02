/**
 * Timezone normalization.
 */
export function normalizeTimezone(rawTz: unknown): string {
  if (!rawTz || typeof rawTz !== 'string') {
    return 'UTC';
  }

  const tz = rawTz.trim();
  if (tz.toUpperCase() === 'UTC' || tz.toUpperCase() === 'GMT' || tz === 'Z') {
    return 'UTC';
  }

  try {
    // Validate with Intl
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    // Fallback to UTC if unrecognized IANA timezone
    return 'UTC';
  }
}
