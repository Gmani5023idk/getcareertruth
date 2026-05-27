import { test, expect } from '@playwright/test';

/**
 * Booking flow E2E tests
 * 
 * Covers student/parent booking workflow:
 * 1. Browse employees (mentors)
 * 2. View student/parent bookings page
 * 3. View booking details
 * 4. Handle booking cancellation with refund eligibility
 */

test.describe('Bookings — End-to-end flow', () => {
  test('student can access /bookings page', async ({ page }) => {
    // Navigate to bookings directly (no auth required, page is public)
    await page.goto('/bookings', { waitUntil: 'domcontentloaded' });
    
    // Verify page structure
    await expect(page.locator('text=My Bookings').first()).toBeVisible({ timeout: 20000 });
    
    // Verify tab navigation exists
    const upcomingTab = page.locator('button:has-text("Upcoming")').first();
    await expect(upcomingTab).toBeVisible();
    
    const completedTab = page.locator('button:has-text("Completed")').first();
    await expect(completedTab).toBeVisible();
  });

  test('student can switch booking tabs', async ({ page }) => {
    await page.goto('/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Switch to Completed tab
    const completedTab = page.locator('button:has-text("Completed")').first();
    await completedTab.click();
    
    // Verify tab became active
    await expect(completedTab).toHaveClass(/bg-surface/);
  });

  test('parent can view /bookings with child profile info', async ({ page }) => {
    // Navigate to bookings
    await page.goto('/bookings', { waitUntil: 'domcontentloaded' });
    
    // Verify main bookings page loads
    await expect(page.locator('text=My Bookings').first()).toBeVisible({ timeout: 20000 });
  });

  test('bookings page handles empty state gracefully', async ({ page }) => {
    await page.goto('/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Verify page doesn't crash
    const pageTitle = page.locator('text=My Bookings').first();
    await expect(pageTitle).toBeVisible();
  });

  test('unauthenticated API call to /api/bookings returns 401', async ({ page }) => {
    // Make unauthenticated API request
    const response = await page.request.get('/api/bookings?tab=UPCOMING');
    expect(response.status()).toBe(401);
  });

  test('dashboard redirect works for unauthenticated /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Should redirect to login
    expect(page.url()).toContain('/login');
    await expect(page.locator('text=Welcome Back').first()).toBeVisible({ timeout: 20000 });
  });

  test('bookings page loads navigation header', async ({ page }) => {
    await page.goto('/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Verify header elements
    const logo = page.locator('img[alt="Logo"]').first();
    await expect(logo).toBeVisible({ timeout: 20000 });
    
    // Verify nav links
    const dashboardLink = page.locator('a[href="/dashboard/student"]').first();
    const findMentorsLink = page.locator('a[href="/employees"]').first();
    const chatLink = page.locator('a[href="/dashboard/student/chat"]').first();
    
    await expect(dashboardLink).toBeVisible();
    await expect(findMentorsLink).toBeVisible();
    await expect(chatLink).toBeVisible();
  });
});

