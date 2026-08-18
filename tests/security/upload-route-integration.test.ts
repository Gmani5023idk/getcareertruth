/**
 * Integration Test: File Upload Route — Magic Bytes + Auth
 * ========================================================
 *
 * Verifies that POST /api/auth/upload-id correctly:
 * - Returns 401 when unauthenticated
 * - Returns 200 with valid PDF magic bytes
 * - Returns 400 when file has wrong magic bytes
 *
 * This is a route-level test — it exercises the actual POST handler.
 */

import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock references ──

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  idVerificationCreate: vi.fn(),
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));

vi.mock('@/lib/db', () => ({
  prisma: {
    idVerification: { create: mocks.idVerificationCreate },
  },
}));

vi.mock('@/lib/audit-log', () => ({
  auditLog: mocks.auditLog,
  AuditAction: {
    ADMIN_ACTION: 'ADMIN_ACTION',
    SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
  },
}));

// ── Import handler AFTER mocks ──

import { POST } from '@/app/api/auth/upload-id/route';

// ── Helpers ──

/**
 * Create a Request whose formData() returns a controlled FormData.
 * This avoids Node.js test environment issues with real File parsing.
 */
function createMockRequestWithFormData(
  fileBytes: Uint8Array,
  fileName: string,
  mimeType: string,
  documentType: string
): Request {
  // Create a real File and FormData, then attach them to a Request via a wrapper
  const file = new File([fileBytes], fileName, { type: mimeType });
  const formData = new FormData();
  formData.set('file', file);
  formData.set('documentType', documentType);

  // Use a base64-encoded body so the Request constructor works
  // Then override formData() to return our pre-built FormData
  const req = new Request('http://localhost/api/auth/upload-id', {
    method: 'POST',
    body: 'placeholder',
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  // Override formData to return our pre-built FormData
  Object.defineProperty(req, 'formData', {
    value: async () => formData,
    writable: false,
  });

  return req;
}

// ── Tests ──

describe('SEC-3 Route-Level: File Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.idVerificationCreate.mockResolvedValue({
      id: 'idv-route-test-001',
      userId: 'user-route-test',
      documentType: 'AADHAAR',
      fileUrl: 'placeholder://test',
      status: 'PENDING',
      expiresAt: new Date('2026-11-13'),
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mocks.auth.mockResolvedValue(null);

    const req = createMockRequestWithFormData(
      new Uint8Array([0x00]),
      'test.pdf',
      'application/pdf',
      'AADHAAR'
    );

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Authentication required');
  });

  it('returns 200 with valid PDF magic bytes (%PDF)', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-route-test', role: 'STUDENT' } });

    // Valid PDF header: %PDF-1.4
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const req = createMockRequestWithFormData(pdfBytes, 'aadhaar.pdf', 'application/pdf', 'AADHAAR');

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.document.type).toBe('AADHAAR');
    expect(body.data.document.fileType).toBe('pdf');
    expect(body.data.document.status).toBe('PENDING');
    expect(body.data.document.id).toBe('idv-route-test-001');

    // Verify DB record was created (Prisma wraps in { data: {...} })
    expect(mocks.idVerificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-route-test',
          documentType: 'AADHAAR',
          status: 'PENDING',
        }),
      })
    );
  });

  it('returns 400 when file has wrong magic bytes (ZIP pretending to be PDF)', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-route-test', role: 'STUDENT' } });

    // ZIP file header: PK\x03\x04 — but MIME type claims application/pdf
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const req = createMockRequestWithFormData(zipBytes, 'fake.pdf', 'application/pdf', 'AADHAAR');

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('File type not supported');

    // Verify DB record was NOT created
    expect(mocks.idVerificationCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for empty file', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-route-test', role: 'STUDENT' } });

    const req = createMockRequestWithFormData(
      new Uint8Array(0),
      'empty.pdf',
      'application/pdf',
      'AADHAAR'
    );

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    // Empty file is rejected — may be 'Empty file' or 'File type not supported' depending on validation order
    expect(body.error).toMatch(/Empty file|File type not supported/);
  });

  it('returns 400 for invalid document type', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-route-test', role: 'STUDENT' } });

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const req = createMockRequestWithFormData(pdfBytes, 'id.pdf', 'application/pdf', 'INVALID_TYPE');

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid document type');
  });
});
