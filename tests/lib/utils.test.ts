import { describe, it, expect } from 'vitest';
import { cn, formatPrice, formatDate, formatTime, formatDateTime, getInitials, truncate } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toContain('foo');
    expect(cn('foo', 'bar')).toContain('bar');
  });
  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
  it('resolves Tailwind conflicts', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });
});

describe('formatPrice', () => {
  it('returns Free for 0', () => {
    expect(formatPrice(0)).toBe('Free');
  });
  it('formats 199 paise as ₹2 (rounded)', () => {
    expect(formatPrice(199)).toBe('₹2');
  });
  it('formats 19900 paise as ₹199', () => {
    expect(formatPrice(19900)).toBe('₹199');
  });
  it('formats -100 paise as -₹1', () => {
    expect(formatPrice(-100)).toBe('-₹1');
  });
  it('formats NaN as ₹NaN', () => {
    expect(formatPrice(NaN)).toBe('₹NaN');
  });
  it('formats Infinity as ₹∞', () => {
    expect(formatPrice(Infinity)).toBe('₹∞');
  });
  it('formats -Infinity as -₹∞', () => {
    expect(formatPrice(-Infinity)).toBe('-₹∞');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
  });
  it('formats Date object', () => {
    expect(formatDate(new Date('2026-01-15'))).toBe('15 Jan 2026');
  });
  it('returns Invalid Date for invalid input', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
  it('returns Invalid Date for empty string', () => {
    expect(formatDate('')).toBe('Invalid Date');
  });
  it('returns Invalid Date for Date(NaN)', () => {
    expect(formatDate(new Date(NaN))).toBe('Invalid Date');
  });
});

describe('formatTime', () => {
  it('formats time from ISO string', () => {
    const result = formatTime('2026-01-15T14:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
  it('formats time from Date object', () => {
    const result = formatTime(new Date('2026-01-15T14:30:00Z'));
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
  it('returns Invalid Date for invalid input', () => {
    expect(formatTime('invalid')).toBe('Invalid Date');
  });
  it('returns Invalid Date for empty string', () => {
    expect(formatTime('')).toBe('Invalid Date');
  });
  it('returns Invalid Date for Date(NaN)', () => {
    expect(formatTime(new Date(NaN))).toBe('Invalid Date');
  });
});

describe('formatDateTime', () => {
  it('combines date and time with separator', () => {
    const result = formatDateTime('2026-01-15T14:30:00Z');
    expect(result).toContain('·');
    expect(result).toContain('15');
    expect(result).toContain('Jan');
  });
});

describe('getInitials', () => {
  it('returns first+last initials for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });
  it('returns single initial for one-word name', () => {
    expect(getInitials('A')).toBe('A');
  });
  it('returns empty string for empty input', () => {
    expect(getInitials('')).toBe('');
  });
  it('returns empty string for whitespace-only input', () => {
    expect(getInitials('  ')).toBe('');
  });
  it('returns first+last for multi-word name', () => {
    expect(getInitials('John Doe Smith')).toBe('JS');
  });
});

describe('truncate', () => {
  it('returns string unchanged when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
  it('returns string unchanged when equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
  it('truncates and adds ellipsis when longer than maxLength', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });
  it('returns empty string for empty input', () => {
    expect(truncate('', 5)).toBe('');
  });
  it('returns ... for non-empty input with maxLength 0', () => {
    expect(truncate('hi', 0)).toBe('...');
  });
  it('returns empty string for empty input with maxLength 0', () => {
    expect(truncate('', 0)).toBe('');
  });
});
