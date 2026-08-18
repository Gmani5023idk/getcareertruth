/**
 * apiHandler — Reusable Route Wrapper for Next.js App Router
 * ============================================================
 *
 * Solves three problems at once:
 * 1. Inconsistent error shapes — every route returns { success: false, error, detail, code }
 * 2. Boilerplate try/catch — handler functions are pure business logic
 * 3. Missing validation / auth — built-in Zod schema validation + role-based auth
 *
 * Usage:
 *   export const GET = apiHandler({
 *     handler: async ({ req }) => {
 *       const data = await prisma.user.findMany();
 *       return NextResponse.json({ success: true, data });
 *     },
 *   });
 *
 *   export const POST = apiHandler({
 *     schema: bookingSchema,           // Zod schema — validates req.json() automatically
 *     requireAuth: true,               // Rejects unauthenticated requests
 *     allowedRoles: ['STUDENT'],       // Optional role check
 *     handler: async ({ req, body, session }) => {
 *       const booking = await prisma.booking.create({ data: body });
 *       return NextResponse.json({ success: true, data: booking }, { status: 201 });
 *     },
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { auth } from '@/lib/auth';

// ────────────────────────────────────────────────────────────────
// Type Exports — consumers can import these for typed responses
// ────────────────────────────────────────────────────────────────

/** Union of all possible error codes returned by the wrapper */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** Standard error response body */
export interface ApiErrorBody {
  success: false;
  error: string;
  detail?: string;
  code: ErrorCode;
}

/** Standard success response body */
export type ApiSuccessBody<T = unknown> = {
  success: true;
  data: T;
};

/** Union type for any API response */
export type ApiResponseBody<T = unknown> = ApiSuccessBody<T> | ApiErrorBody;

// ────────────────────────────────────────────────────────────────
// Session type
// ────────────────────────────────────────────────────────────────

export interface HandlerSession {
  user: {
    id: string;
    role: 'STUDENT' | 'EMPLOYEE' | 'PARENT' | 'ADMIN';
    email?: string | null;
    name?: string | null;
  };
}

// ────────────────────────────────────────────────────────────────
// Configuration options for the handler
// ────────────────────────────────────────────────────────────────

interface BaseHandlerOptions {
  /** Require a valid session. Default: false */
  requireAuth?: boolean;
  /** If set, restricts access to these role(s). Implies requireAuth: true */
  allowedRoles?: string[];
  /**
   * Parse and validate query params instead of request body.
   * Automatically true for GET requests; set this for other methods
   * (e.g., DELETE with query params) if needed.
   */
  useQueryParams?: boolean;
}

interface WithSchema<T> extends BaseHandlerOptions {
  /** Zod schema to validate the request body (POST/PUT) or query (GET) */
  schema: ZodSchema<T>;
  handler: (params: {
    req: NextRequest;
    body: T; // validated + typed
    session: HandlerSession | null;
    params?: Record<string, string>;
  }) => Promise<NextResponse>;
}

interface WithoutSchema extends BaseHandlerOptions {
  schema?: never;
  handler: (params: {
    req: NextRequest;
    body: unknown;
    session: HandlerSession | null;
    params?: Record<string, string>;
  }) => Promise<NextResponse>;
}

type HandlerOptions<T> = WithSchema<T> | WithoutSchema;

// ────────────────────────────────────────────────────────────────
// Helpers for building error responses
// ────────────────────────────────────────────────────────────────

function errorResponse(
  error: string,
  code: ErrorCode,
  status: number,
  detail?: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { success: false, error, detail, code },
    { status }
  );
}

function formatZodError(err: ZodError): string {
  // Collapse multiple issues into a readable sentence
  return err.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') + ': ' : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}

// ────────────────────────────────────────────────────────────────
// Main wrapper — overloaded for proper type inference
// ────────────────────────────────────────────────────────────────

/**
 * Overload 1: With a Zod schema — `body` is typed as the schema's inferred type
 *
 * NOTE: The second `context` parameter is omitted from the return type to avoid
 * Next.js 16 auto-generated type checker errors. Next.js 16's ParamCheck<RouteContext>
 * validation rejects optional context params (i.e. `{ params: Promise<...> } | undefined`)
 * for non-dynamic routes. The handler implementation still accepts and uses the
 * context parameter at runtime via optional chaining.
 */
export function apiHandler<T>(
  options: WithSchema<T>
): (
  req: NextRequest
) => Promise<NextResponse>;

/**
 * Overload 2: Without a Zod schema — `body` is `unknown`
 */
export function apiHandler(
  options: WithoutSchema
): (
  req: NextRequest
) => Promise<NextResponse>;

/** Implementation (signature is not visible to callers) */
export function apiHandler<T>(options: HandlerOptions<T>) {
  const { schema, requireAuth = false, allowedRoles, handler } = options;

  // Return a function matching Next.js App Router route handler signature
  return async function routeHandler(
    req: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> {
    try {
      // ── Resolve dynamic route params ──
      const resolvedParams = context?.params
        ? await context.params
        : undefined;

      // ── Authentication (optional, controlled by requireAuth) ──
      let session: HandlerSession | null = null;

      if (requireAuth || allowedRoles) {
        const rawSession = await auth();

        if (!rawSession?.user?.id) {
          return errorResponse(
            'Authentication required',
            'UNAUTHORIZED',
            401
          );
        }

        session = {
          user: {
            id: rawSession.user.id,
            role: rawSession.user.role as HandlerSession['user']['role'],
            email: rawSession.user.email,
            name: rawSession.user.name,
          },
        };

        // Role check (if specified, non-empty)
        // Empty array = no restriction (same as not passing the option)
        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(session.user.role)) {
            return errorResponse(
              `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
              'FORBIDDEN',
              403
            );
          }
        }
      }

      // ── Input Validation (if schema provided) ──
      let body: unknown = undefined;

      if (schema) {
        // Determine input source: query params vs request body
        const isQueryParamBased = options.useQueryParams || req.method === 'GET';

        if (isQueryParamBased && req.method !== 'GET') {
          // Developer explicitly set useQueryParams on a non-GET method
          // This means the body is intentionally ignored — log a warning
          console.warn(
            `[apiHandler] useQueryParams is true for ${req.method} ${req.nextUrl.pathname}. ` +
            'Request body will be ignored.'
          );
        }

        if (isQueryParamBased) {
          // Parse query params into a plain object
          const searchParams = Object.fromEntries(
            req.nextUrl.searchParams.entries()
          );
          body = schema.parse(searchParams);
        } else {
          // Parse JSON body; catch malformed JSON BEFORE schema validation
          // so we return a clear 400, not a cryptic 500
          let raw: unknown;
          try {
            raw = await req.json();
          } catch {
            return errorResponse(
              'Invalid JSON in request body',
              'VALIDATION_ERROR',
              400
            );
          }
          body = schema.parse(raw);
        }
      } else if (req.method !== 'GET' && req.method !== 'HEAD') {
        // No schema — still parse the body so the handler can access it
        try {
          body = await req.json();
        } catch {
          // Malformed JSON is allowed without a schema — the handler deals with it
          body = {};
        }
      }

      // ── Execute the handler ──
      return await handler({
        req,
        body: body as T,
        session,
        params: resolvedParams,
      });
    } catch (error) {
      // ── Centralized error handling ──

      // Zod validation errors → 400 with clear message
      if (error instanceof ZodError) {
        return errorResponse(
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          formatZodError(error)
        );
      }

      // PaymentError — safe user message already set, full error logged
      if (error && typeof error === 'object' && error.constructor.name === 'PaymentError') {
        const pe = error as { userMessage?: string; message?: string; stack?: string };
        console.error('[apiHandler] PaymentError:', pe.message, pe.stack);
        return errorResponse(
          pe.userMessage ?? 'Payment could not be processed. Please try again.',
          'INTERNAL_ERROR',
          500,
        );
      }

      // Prisma known-request errors (unique constraint, not found, etc.)
      // Note: uses duck-typing (checking `code` property) instead of
      // `instanceof PrismaClientKnownRequestError` to avoid importing
      // Prisma types into this shared utility module. This works reliably
      // in practice because Prisma errors always have a string `code`.
      // If a non-Prisma error coincidentally has `code: 'P2002'`, it
      // would be misidentified — this is an accepted trade-off.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code: string }).code === 'string'
      ) {
        const prismaError = error as {
          code: string;
          meta?: { target?: string[] };
          message?: string;
        };

        if (prismaError.code === 'P2002') {
          // Unique constraint violation
          const field =
            prismaError.meta?.target?.join(', ') || 'resource';
          return errorResponse(
            `A record with this ${field} already exists`,
            'CONFLICT',
            409
          );
        }

        if (prismaError.code === 'P2025') {
          // Record not found
          return errorResponse(
            'The requested resource was not found',
            'NOT_FOUND',
            404
          );
        }

        if (prismaError.code === 'P2003') {
          // Foreign key constraint
          return errorResponse(
            'Referenced resource does not exist',
            'NOT_FOUND',
            404
          );
        }
      }

      // Catch-all: log the full error, return a safe message
      console.error('[apiHandler] Unhandled error:', error);

      // Don't leak internal error details in production
      const isDev = process.env.NODE_ENV === 'development';
      const message = isDev && error instanceof Error
        ? error.message
        : 'An unexpected error occurred';

      return errorResponse(
        message,
        'INTERNAL_ERROR',
        500
      );
    }
  };
}

// ────────────────────────────────────────────────────────────────
// Convenience: typed success response builder
// ────────────────────────────────────────────────────────────────

export function success<T>(data: T, status: number = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status });
}
