/**
 * Performance Optimization Utilities
 *
 * This file contains utilities for optimizing the performance of the application.
 * Includes code splitting, lazy loading, and image optimization helpers.
 */

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createElement } from 'react';

/**
 * Lazy load a component with a loading state
 * @param componentPath - Path to the component to lazy load
 * @param loadingComponent - Optional loading component
 * @returns Lazy loaded component
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  componentPath: () => Promise<{ default: T }>,
  loadingComponent?: React.ComponentType
) {
  return dynamic(componentPath, {
    loading: loadingComponent ? () => createElement(loadingComponent) : undefined,
    ssr: false, // Disable server-side rendering for better performance
  });
}

/**
 * Lazy load a component with a skeleton loader
 * @param componentPath - Path to the component to lazy load
 * @param skeletonComponent - Skeleton component to show while loading
 * @returns Lazy loaded component
 */
export function lazyLoadWithSkeleton<T extends React.ComponentType<any>>(
  componentPath: () => Promise<{ default: T }>,
  skeletonComponent: React.ComponentType
) {
  return dynamic(componentPath, {
    loading: () => createElement(skeletonComponent),
    ssr: false,
  });
}

/**
 * Optimize image with Next.js Image component
 * @param src - Image source
 * @param alt - Alt text
 * @param width - Image width
 * @param height - Image height
 * @param priority - Whether to prioritize loading
 * @returns Optimized Image component
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return createElement(Image, {
    src,
    alt,
    width,
    height,
    priority,
    className,
    loading: priority ? 'eager' : 'lazy',
    ...props,
  });
}

/**
 * Debounce function to limit how often a function can be called
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit how often a function can be called
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if the user is on a slow connection
 * @returns Whether the connection is slow
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return false;

  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

/**
 * Check if the user is on a mobile device
 * @returns Whether the device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get the appropriate image quality based on connection speed
 * @returns Image quality (0-100)
 */
export function getImageQuality(): number {
  if (isSlowConnection()) {
    return 50;
  }
  return 80;
}

/**
 * Preload a resource
 * @param url - URL of the resource to preload
 * @param as - Type of resource (e.g., 'image', 'script', 'style')
 */
export function preloadResource(url: string, as: string = 'image'): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Preload critical images
 * @param images - Array of image URLs to preload
 */
export function preloadCriticalImages(images: string[]): void {
  images.forEach((image) => preloadResource(image, 'image'));
}

/**
 * Lazy load images when they come into viewport
 * @param callback - Callback function when image comes into viewport
 * @returns Intersection observer
 */
export function lazyLoadImages(callback: (entries: IntersectionObserverEntry[]) => void): IntersectionObserver {
  if (typeof window === 'undefined') {
    return {} as IntersectionObserver;
  }

  const options = {
    rootMargin: '50px',
    threshold: 0.01,
  };

  return new IntersectionObserver(callback, options);
}

/**
 * Measure performance of a function
 * @param fn - Function to measure
 * @param label - Label for the measurement
 * @returns Result of the function
 */
export async function measurePerformance<T>(
  fn: () => Promise<T> | T,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  console.log(`${label}: ${(end - start).toFixed(2)}ms`);

  return result;
}

/**
 * Report web vitals to analytics
 * @param metric - Web vital metric
 */
export function reportWebVitals(metric: any): void {
  if (typeof window === 'undefined') return;

  // Send to analytics service
  console.log('Web Vital:', metric);

  // Example: Send to Google Analytics
  // if (window.gtag) {
  //   window.gtag('event', metric.name, {
  //     value: Math.round(
  //       metric.name === 'CLS' ? metric.value * 1000 : metric.value
  //     ),
  //     event_label: metric.id,
  //     non_interaction: true,
  //   });
  // }
}

/**
 * Optimize bundle size by code splitting
 * @param routes - Array of routes to code split
 * @returns Code split routes
 */
export function codeSplitRoutes(routes: any[]): any[] {
  return routes.map((route) => {
    if (route.component) {
      return {
        ...route,
        component: lazyLoad(route.component),
      };
    }
    return route;
  });
}

/**
 * Get the appropriate image format based on browser support
 * @returns Image format (webp, avif, or jpg)
 */
export function getOptimalImageFormat(): string {
  if (typeof document === 'undefined') return 'jpg';

  const canvas = document.createElement('canvas');
  if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif';
  }
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp';
  }
  return 'jpg';
}

/**
 * Create a responsive image source set
 * @param baseUrl - Base URL of the image
 * @param widths - Array of widths to generate
 * @returns Source set string
 */
export function createResponsiveSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
}

/**
 * Optimize font loading
 * @param fonts - Array of font URLs to preload
 */
export function optimizeFontLoading(fonts: string[]): void {
  if (typeof document === 'undefined') return;

  fonts.forEach((font) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Reduce JavaScript bundle size by tree shaking
 * This is a configuration helper for webpack/next.config.js
 */
export const treeShakingConfig = {
  // Enable tree shaking
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
  // Remove console.log in production
  terserOptions: {
    compress: {
      drop_console: true,
    },
  },
};

/**
 * Enable code splitting for better performance
 */
export const codeSplittingConfig = {
  // Split chunks by size
  splitChunks: {
    chunks: 'all',
    minSize: 20000,
    maxSize: 244000,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 25,
    automaticNameDelimiter: '~',
    cacheGroups: {
      defaultVendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
        reuseExistingChunk: true,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
};
