/**
 * Convert local date (YYYY-MM-DD) + time (HH:mm) to ISO 8601 UTC for API requests.
 * Interprets the input in the user's local timezone.
 */
export function toIsoDateTime(date: string, time: string): string {
  const hhmm = time.slice(0, 5);
  return new Date(`${date}T${hhmm}:00`).toISOString();
}

export function toIsoDateTimeFromLocal(localDateTime: string): string {
  const [date, time] = localDateTime.split('T');
  if (!date || !time) return localDateTime;
  return toIsoDateTime(date, time);
}
