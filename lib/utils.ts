import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Shared locale for Indian English formatting (currency, dates, times). */
const LOCALE = 'en-IN' as const;

/**
 * Merge Tailwind CSS class names with conflict resolution.
 * Wraps `clsx` + `tailwind-merge` so later classes override earlier ones
 * (e.g. `cn('p-4', 'p-8')` → `'p-8'`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a price in paise as an INR currency string.
 *
 * Input is in **paise** (100 paise = ₹1). The value is divided by 100 and
 * rounded to the nearest whole rupee. Returns `'Free'` for zero.
 *
 * @example formatPrice(19900)  // '₹199'
 * @example formatPrice(199)    // '₹2'  (1.99 rounded)
 * @example formatPrice(0)      // 'Free'
 */
export const formatPrice = (paise: number): string => {
  if (paise === 0) return 'Free';
  return (paise / 100).toLocaleString(LOCALE, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
};

/**
 * Format a date (ISO string or Date object) as `'15 Jan 2026'`.
 * Returns `'Invalid Date'` for unparseable inputs.
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date (ISO string or Date object) as `'02:30 PM'` (12-hour).
 * Returns `'Invalid Date'` for unparseable inputs.
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format a date as `'15 Jan 2026 · 02:30 PM'`.
 */
export const formatDateTime = (date: Date | string): string => {
  return `${formatDate(date)} · ${formatTime(date)}`;
};

/**
 * Extract initials from a name (first + last character, uppercased).
 * Returns empty string for empty or whitespace-only input.
 *
 * @example getInitials('John Doe')      // 'JD'
 * @example getInitials('A')              // 'A'
 * @example getInitials('')               // ''
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Truncate a string to `maxLength` characters, appending `'...'` if truncated.
 * Returns the original string when `str.length <= maxLength`.
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};
