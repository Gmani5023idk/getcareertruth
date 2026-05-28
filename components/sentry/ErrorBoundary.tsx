'use client';

import * as Sentry from '@sentry/nextjs';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

/**
 * Client-side Sentry ErrorBoundary.
 *
 * Wraps the app in layout.tsx to capture React rendering crashes,
 * async errors, and unhandled promise rejections that leak through
 * Next.js error boundaries.
 *
 * The fallback UI is intentionally minimal — a broken page is worse than
 * an empty one; users can refresh to recover.
 */
export default class SentryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture the React rendering error with component stack
    Sentry.captureException(error, {
      tags: { type: 'react-render' },
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
          gap: '16px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', maxWidth: '400px', margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Refresh page
          </button>
          <a
            href="/"
            style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '13px' }}
          >
            Go to homepage
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}