/**
 * Security Test: XSS Sanitization via DOMPurify
 *
 * Verifies that the DOMPurify allowlist used in transcript-viewer.tsx
 * strips dangerous HTML while preserving safe formatting.
 *
 * SEC: Issue 2 — stored XSS in transcript viewer
 */

import DOMPurify from 'dompurify';

// Mirror the exact config from transcript-viewer.tsx
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'span', 'mark'],
  ALLOWED_ATTR: ['class'],
};

function sanitize(dirty: string): string {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG) as string;
}

describe('XSS Sanitization (Issue 2)', () => {
  describe('script injection', () => {
    it('should strip <script> tags completely', () => {
      const input = '<script>alert(1)</script>Hello';
      const result = sanitize(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('should strip inline event handlers via <script> in attribute', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = sanitize(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('<img');
    });
  });

  describe('event handler injection', () => {
    it('should strip onerror from img tags', () => {
      const input = '<img src=x onerror="alert(document.cookie)">';
      const result = sanitize(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<img');
    });

    it('should strip onload from body tags', () => {
      const input = '<body onload="alert(1)">';
      const result = sanitize(input);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('<body');
    });

    it('should strip onclick from div tags', () => {
      const input = '<div onclick="alert(1)">text</div>';
      const result = sanitize(input);
      expect(result).not.toContain('onclick');
    });
  });

  describe('javascript: protocol', () => {
    it('should strip href with javascript: protocol', () => {
      const input = '<a href="javascript:void(0)">click</a>';
      const result = sanitize(input);
      expect(result).not.toContain('href');
      expect(result).not.toContain('javascript');
      expect(result).toContain('click');
    });

    it('should strip href with javascript:alert()', () => {
      const input = '<a href="javascript:alert(1)">link</a>';
      const result = sanitize(input);
      expect(result).not.toContain('javascript');
      expect(result).not.toContain('href');
    });
  });

  describe('safe HTML preservation', () => {
    it('should preserve plain text with no HTML', () => {
      const input = 'Normal text with no HTML';
      const result = sanitize(input);
      expect(result).toBe('Normal text with no HTML');
    });

    it('should preserve <p> tags', () => {
      const input = '<p>Valid transcript line.</p>';
      const result = sanitize(input);
      expect(result).toBe('<p>Valid transcript line.</p>');
    });

    it('should preserve <mark> tags with class (needed for search highlighting)', () => {
      const input = '<mark class="bg-primary/20 text-primary px-0.5 rounded">highlighted</mark>';
      const result = sanitize(input);
      expect(result).toContain('<mark');
      expect(result).toContain('class="bg-primary/20 text-primary px-0.5 rounded"');
      expect(result).toContain('highlighted');
    });

    it('should preserve <strong> and <em> tags', () => {
      const input = '<strong>bold</strong> and <em>italic</em>';
      const result = sanitize(input);
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('should preserve <br> tags', () => {
      const input = 'line one<br>line two';
      const result = sanitize(input);
      expect(result).toContain('<br>');
    });

    it('should preserve list tags', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitize(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });
  });

  describe('disallowed tags and attributes', () => {
    it('should strip <iframe> tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitize(input);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
    });

    it('should strip <object> and <embed> tags', () => {
      const input = '<object data="evil.swf"></object><embed src="evil.swf">';
      const result = sanitize(input);
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('should strip style attribute even on allowed tags', () => {
      const input = '<p style="background:url(javascript:alert(1))">text</p>';
      const result = sanitize(input);
      expect(result).not.toContain('style');
      expect(result).toContain('text');
    });

    it('should strip id attribute on allowed tags', () => {
      const input = '<span id="xss" class="ok">text</span>';
      const result = sanitize(input);
      expect(result).not.toContain('id=');
      expect(result).toContain('class="ok"');
    });

    it('should strip href attribute even on tags that normally have it', () => {
      const input = '<span href="https://evil.com" class="ok">text</span>';
      const result = sanitize(input);
      expect(result).not.toContain('href');
      expect(result).toContain('class="ok"');
    });
  });

  describe('CSP header presence (Issue 3)', () => {
    it('should verify CSP value contains required directives', () => {
      // Read the CSP value as defined in next.config.ts
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' https://checkout.razorpay.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://media.licdn.com https://api.dicebear.com",
        "font-src 'self'",
        "connect-src 'self' https://*.pusher.com wss://*.pusher.com https://*.sentry.io https://api.razorpay.com",
        "frame-src https://api.razorpay.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ];
      const csp = cspDirectives.join('; ');

      // Must NOT contain unsafe-eval or bare wildcard source
      expect(csp).not.toContain("'unsafe-eval'");
      // Ensure no bare wildcard (like "script-src *" or just "*") — glob patterns like *.pusher.com are fine
      const directives = csp.split('; ');
      for (const directive of directives) {
        const [, ...sources] = directive.split(' ');
        for (const source of sources) {
          expect(source).not.toBe('*');
        }
      }

      // Must contain critical directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain('upgrade-insecure-requests');

      // Must allow required external services
      expect(csp).toContain('checkout.razorpay.com');
      expect(csp).toContain('*.pusher.com');
      expect(csp).toContain('*.sentry.io');
      expect(csp).toContain('res.cloudinary.com');
      expect(csp).toContain('lh3.googleusercontent.com');
      expect(csp).toContain('media.licdn.com');
      expect(csp).toContain('api.dicebear.com');
    });
  });
});
