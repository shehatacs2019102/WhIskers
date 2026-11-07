/** Bookings are clinic-local calendar dates and times, so we avoid UTC conversions entirely. */

export const MAX_DAYS_AHEAD = 90;

const pad = (n: number): string => String(n).padStart(2, '0');

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** "2026-11-12" */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "Thursday, 12 November" */
export function formatLongDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(parseIsoDate(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')}`;
}

/** "Thursday 12 November 2026", for screen readers on calendar buttons. */
export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** "13:30" becomes "1:30 PM" */
export function formatTime12(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${suffix}`;
}

/** Combines "2026-11-12" and "10:30" into the API's "2026-11-12T10:30:00". */
export function toStartsAt(isoDate: string, time: string): string {
  return `${isoDate}T${time}:00`;
}
