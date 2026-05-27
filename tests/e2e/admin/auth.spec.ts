import { test, expect } from '@playwright/test';

test.describe('Admin Panel — Auth Guard', () => {
  test('redirects unauthenticated users to /unauthorized when accessing /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/unauthorized**');
    await expect(page.locator('text=Access Denied').first()).toBeVisible({ timeout: 10000 });
  });

  test('redirects unauthenticated users to /unauthorized when accessing /admin/dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/unauthorized**');
    await expect(page.locator('text=Access Denied').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows unauthorised page with link back to home', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.locator('text=Access Denied').first()).toBeVisible({ timeout: 10000 });
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('returns 403 for unauthenticated API call to /api/admin/stats', async ({ page }) => {
    const response = await page.request.get('/api/admin/stats');
    expect(response.status()).toBe(403);
  });

  test('returns 403 for unauthenticated API call to /api/admin/users', async ({ page }) => {
    const response = await page.request.get('/api/admin/users');
    expect(response.status()).toBe(403);
  });

  test('returns 403 for unauthenticated API call to /api/admin/payments', async ({ page }) => {
    const response = await page.request.get('/api/admin/payments');
    expect(response.status()).toBe(403);
  });
});
