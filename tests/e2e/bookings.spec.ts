import { test, expect } from '@playwright/test';

test.describe('Bookings — Auth protection', () => {
  test('loads /bookings for unauthenticated users and renders page shell', async ({ page }) => {
    await page.goto('/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page.locator('text=My Bookings').first()).toBeVisible({ timeout: 20000 });
    expect(page.url()).toContain('/bookings');
  });

  test('redirects unauthenticated users from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    expect(page.url()).toContain('/login');
    await expect(page.locator('text=Welcome Back').first()).toBeVisible({ timeout: 20000 });
  });

  test('unauthenticated API call to /api/bookings returns 401', async ({ page }) => {
    const response = await page.request.get('/api/bookings?tab=UPCOMING');
    expect(response.status()).toBe(401);
  });
});
