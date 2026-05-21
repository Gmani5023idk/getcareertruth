/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize and validate user input to prevent
 * XSS, SQL injection, and other security vulnerabilities.
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Initialize DOMPurify with a server-side DOM
const window = new JSDOM('').window;
// DOMPurify expects a WindowLike type; jsdom's Window satisfies this at runtime
const purify = DOMPurify(window as any);

// Password strength levels
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

// Password strength configuration
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Evaluate password strength
 */
export function evaluatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  } else {
    score += Math.min(password.length / 8, 2);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
    score -= 0.5;
  }

  if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
    errors.push('Password should contain a mix of character types');
    score -= 1;
  }

  // Common password check
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty123',
    'admin123',
    'letmein',
    'welcome',
    'monkey123',
    'dragon123',
    'master123',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common and easily guessable');
    score -= 2;
  }

  let strength: PasswordStrength;
  if (score < 2) {
    strength = PasswordStrength.WEAK;
  } else if (score < 3) {
    strength = PasswordStrength.MEDIUM;
  } else if (score < 4) {
    strength = PasswordStrength.STRONG;
  } else {
    strength = PasswordStrength.VERY_STRONG;
  }

  return { strength, score: Math.max(0, score), errors };
}

/**
 * Validate password meets minimum strength requirements
 */
export function validatePassword(password: string): void {
  const { strength, errors } = evaluatePasswordStrength(password);

  if (strength === PasswordStrength.WEAK) {
    throw new Error(`Weak password: ${errors.join('; ')}`);
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // HTML entity encode to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Email must be a string');
  }

  const email = input.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Limit length
  if (email.length > 254) {
    throw new Error('Email exceeds maximum length');
  }

  return email;
}

/**
 * Sanitize phone number input
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Phone number must be a string');
  }

  // Remove all non-digit characters
  const phone = input.replace(/\D/g, '');

  // Validate length (assuming Indian phone numbers: 10 digits)
  if (phone.length !== 10) {
    throw new Error('Phone number must be 10 digits');
  }

  return phone;
}

/**
 * Sanitize URL input
 */
export function sanitizeURL(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('URL must be a string');
  }

  const url = input.trim();

  // Basic URL validation
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    // Limit length
    if (url.length > 2048) {
      throw new Error('URL exceeds maximum length');
    }

    return url;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string, min?: number, max?: number): number {
  const num = Number(input);

  if (isNaN(num)) {
    throw new Error('Input must be a valid number');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize file name input
 */
export function sanitizeFileName(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('File name must be a string');
  }

  const fileName = input.trim();

  // Remove path traversal attempts
  const sanitized = fileName.replace(/[\/\\]/g, '');

  // Remove null bytes
  const cleaned = sanitized.replace(/\0/g, '');

  // Limit length
  if (cleaned.length > 255) {
    throw new Error('File name exceeds maximum length');
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.sh',
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.js',
    '.vbs',
    '.ps1',
  ];

  const extension = cleaned.toLowerCase().slice(cleaned.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    throw new Error('Dangerous file extension not allowed');
  }

  return cleaned;
}

/**
 * Validate JSON input
 */
export function validateJSON(input: string): any {
  try {
    const parsed = JSON.parse(input);

    // Check for prototype pollution
    if (parsed.__proto__ || parsed.constructor || parsed.prototype) {
      throw new Error('Invalid JSON: prototype pollution detected');
    }

    return parsed;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(input: any[], validator: (item: any) => T, maxLength: number = 100): T[] {
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }

  if (input.length > maxLength) {
    throw new Error(`Array exceeds maximum length of ${maxLength}`);
  }

  return input.map(validator);
}

/**
 * Validate object input
 */
export function validateObject<T>(
  input: any,
  schema: Record<string, (value: any) => any>
): T {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }

  const result: any = {};

  for (const [key, validator] of Object.entries(schema)) {
    if (input[key] !== undefined) {
      result[key] = validator(input[key]);
    }
  }

  return result as T;
}

/**
 * Sanitize HTML content using DOMPurify
 * Provides comprehensive XSS protection
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('HTML must be a string');
  }

  // Use DOMPurify to sanitize HTML
  const sanitized = purify.sanitize(input, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'span', 'div', 'sub', 'sup', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });

  // Limit length
  if (sanitized.length > 10000) {
    throw new Error('HTML content exceeds maximum length');
  }

  return sanitized;
}

/**
 * Validate request payload size
 */
export function validatePayloadSize(payload: any, maxSize: number = 10 * 1024 * 1024): void {
  const size = JSON.stringify(payload).length;

  if (size > maxSize) {
    throw new Error(`Payload exceeds maximum size of ${maxSize} bytes`);
  }
}

/**
 * Sanitize and validate user input based on type
 */
export function sanitizeInput(input: any, type: string, options?: any): any {
  switch (type) {
    case 'string':
      return sanitizeString(input, options?.maxLength);
    case 'email':
      return sanitizeEmail(input);
    case 'phone':
      return sanitizePhone(input);
    case 'url':
      return sanitizeURL(input);
    case 'number':
      return sanitizeNumber(input, options?.min, options?.max);
    case 'filename':
      return sanitizeFileName(input);
    case 'json':
      return validateJSON(input);
    case 'html':
      return sanitizeHTML(input);
    default:
      throw new Error(`Unknown input type: ${type}`);
  }
}
