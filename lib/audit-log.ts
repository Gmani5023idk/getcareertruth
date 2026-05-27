/**
 * Audit Logging Utility
 *
 * Provides structured audit logging for all critical user and payment actions.
 * Uses Prisma to persist audit records in the database.
 */

import { prisma } from '@/lib/db';

/**
 * Enum of all audit actions
 */
export enum AuditAction {
  // User actions
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',

  // Admin actions
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_ACTION = 'ADMIN_ACTION',
  ADMIN_USER_DELETED = 'ADMIN_USER_DELETED',
  ADMIN_ROLE_CHANGED = 'ADMIN_ROLE_CHANGED',

  // Payment actions
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Order actions
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // Webhook actions
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',

  // Security actions
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
}

/**
 * Parameters for creating an audit log entry
 */
export interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
}

/**
 * Sanitize metadata before storing in the database.
 * Removes sensitive fields like passwords, secrets, tokens, keys, card numbers, CVV, PINs.
 * Truncates long string values.
 * Masks email addresses.
 */
export function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null;

  const sensitiveKeys = [
    'password', 'secret', 'token', 'key', 'card', 'cvv', 'pin',
    'passwordHash', 'password_hash', 'access_token', 'refresh_token',
    'id_token', 'client_secret', 'api_key', 'apiKey', 'privateKey',
    'private_key', 'sessionToken', 'session_token',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip sensitive keys entirely
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Handle different value types
    if (typeof value === 'string') {
      // Mask email addresses
      if (value.includes('@') && value.includes('.')) {
        const [local, domain] = value.split('@');
        const maskedLocal = local.length > 0
          ? local[0] + '***'
          : '***';
        sanitized[key] = `${maskedLocal}@${domain}`;
      }
      // Truncate long strings
      else if (value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...[truncated]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Extract IP address from a Request object
 */
export function extractIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

/**
 * Extract User-Agent from a Request object
 */
export function extractUserAgentFromRequest(req: Request): string | null {
  return req.headers.get('user-agent');
}

/**
 * Create an audit log entry
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: sanitizeMetadata(params.metadata ?? null) as any,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        success: params.success ?? true,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Convenience function for admin action logging with before/after diff
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entity: string,
  entityId: string,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null
): Promise<void> {
  await auditLog({
    userId: adminId,
    action: AuditAction.ADMIN_ACTION,
    entity,
    entityId,
    metadata: {
      action,
      before: beforeState,
      after: afterState,
      ...(metadata ?? {}),
    },
    ipAddress,
    success: true,
  });
}
