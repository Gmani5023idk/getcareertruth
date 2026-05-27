/**
 * Encryption Utility
 *
 * Provides AES-256-CBC encryption/decryption for sensitive data at rest
 * (e.g. bank account numbers, IFSC codes, UPI IDs).
 *
 * Environment variables:
 * - ENCRYPTION_KEY: Hex-encoded 32-byte key (64 hex characters)
 *
 * Output format: "<iv_hex>:<encrypted_hex>"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // bytes

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters), got ${key.length} bytes`
    );
  }
  return key;
}

/**
 * Encrypt a plain text string.
 * Returns format: "<iv_hex>:<encrypted_hex>"
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * Expects format: "<iv_hex>:<encrypted_hex>"
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  // If the text doesn't match the encrypted format, return as-is (plaintext fallback)
  if (!encryptedText.includes(':') || encryptedText.startsWith('upi_') || encryptedText.startsWith('payout_')) {
    return encryptedText;
  }
  const parts = encryptedText.split(':');
  if (parts.length < 2) return encryptedText;

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts.slice(1).join(':');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask sensitive financial data, showing only the last 4 characters.
 * Examples:
 *   "1234567890" -> "XXXXXXX890"
 *   "ICIC0001234" -> "XXXXXXXX234"
 *   "user@upi" -> "XXXXXupi"
 */
export function maskSensitive(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return value;
  const visible = value.slice(-4);
  const masked = value.slice(0, -4).replace(/./g, 'X');
  return `${masked}${visible}`;
}

/**
 * Generate a new encryption key and return its hex representation.
 * Useful for initial setup: node -e "console.log(require('./lib/encryption').generateKey())"
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
