/**
 * API Route Validation Middleware
 *
 * Provides validation and sanitization for API route requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput, validatePayloadSize, validatePassword } from '@/lib/sanitize';

/**
 * Validation schema for common input types
 */
export const VALIDATION_SCHEMAS = {
  // Authentication
  login: {
    email: (value: any) => sanitizeInput(value, 'email'),
    password: (value: any) => sanitizeInput(value, 'string', { maxLength: 128 }),
  },

  signup: {
    name: (value: any) => sanitizeInput(value, 'string', { maxLength: 100 }),
    email: (value: any) => sanitizeInput(value, 'email'),
    phone: (value: any) => sanitizeInput(value, 'phone'),
    password: (value: any) => {
      const sanitized = sanitizeInput(value, 'string', { maxLength: 128 });
      validatePassword(sanitized);
      return sanitized;
    },
  },

  // Booking
  booking: {
    employeeId: (value: any) => sanitizeInput(value, 'string', { maxLength: 50 }),
    timeSlot: (value: any) => sanitizeInput(value, 'string', { maxLength: 50 }),
    topics: (value: any) => sanitizeInput(value, 'string', { maxLength: 500 }),
    notes: (value: any) => sanitizeInput(value, 'string', { maxLength: 1000 }),
  },

  // Chat
  message: {
    conversationId: (value: any) => sanitizeInput(value, 'string', { maxLength: 50 }),
    content: (value: any) => sanitizeInput(value, 'string', { maxLength: 5000 }),
  },

  // Review
  review: {
    bookingId: (value: any) => sanitizeInput(value, 'string', { maxLength: 50 }),
    rating: (value: any) => sanitizeInput(value, 'number', { min: 1, max: 5 }),
    comment: (value: any) => sanitizeInput(value, 'string', { maxLength: 1000 }),
  },

  // File upload
  fileUpload: {
    fileName: (value: any) => sanitizeInput(value, 'filename'),
  },
};

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  body: any,
  schema: Record<string, (value: any) => any>
): T {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const result: any = {};

  for (const [key, validator] of Object.entries(schema)) {
    if (body[key] !== undefined) {
      try {
        result[key] = validator(body[key]);
      } catch (error: any) {
        throw new Error(`Invalid ${key}: ${error.message}`);
      }
    }
  }

  return result as T;
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: Record<string, (value: any) => any>
): Record<string, any> {
  const result: any = {};

  for (const [key, validator] of Object.entries(schema)) {
    const value = searchParams.get(key);
    if (value !== null) {
      try {
        result[key] = validator(value);
      } catch (error: any) {
        throw new Error(`Invalid query parameter ${key}: ${error.message}`);
      }
    }
  }

  return result;
}

/**
 * Create validation middleware for API routes
 */
export function withValidation<T>(
  schema: Record<string, (value: any) => any>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      // Parse request body
      let body: any = {};
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          body = await request.json();
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          );
        }
      }

      // Validate payload size
      try {
        validatePayloadSize(body);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 413 }
        );
      }

      // Validate request body
      let validatedData: T;
      try {
        validatedData = validateRequestBody<T>(body, schema);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Call handler with validated data
      return await handler(request, validatedData);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Validation failed', message: error.message },
        { status: 400 }
      );
    }
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, maxSize: number = 10 * 1024 * 1024): void {
  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum of ${maxSize} bytes`);
  }

  // Check file name
  try {
    sanitizeInput(file.name, 'filename');
  } catch (error: any) {
    throw new Error(`Invalid file name: ${error.message}`);
  }

  // Check file type (basic validation)
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
}

/**
 * Sanitize error messages before sending to client
 */
export function sanitizeError(error: any): { error: string; message?: string } {
  // Don't expose internal error details
  const message = error.message || 'An error occurred';

  // Remove any potential sensitive information
  const sanitized = message
    .replace(/password/gi, '***')
    .replace(/secret/gi, '***')
    .replace(/token/gi, '***')
    .replace(/key/gi, '***');

  return {
    error: 'Request failed',
    message: sanitized,
  };
}
