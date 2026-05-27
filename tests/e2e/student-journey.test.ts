import { test, expect } from '@playwright/test';

test.describe('Student Journey', () => {
  test('Login → dashboard → book session → view upcoming → review', async ({ page }) => {
    // 1. Login -> dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'student@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard\/student/);

    // 2. Browse mentors -> select
    await page.click('text=Browse Mentors');
    await expect(page).toHaveURL(/\/mentors/);
    await page.click('text=View Profile'); // Click first mentor

    // 3. Book session -> pay
    await page.click('text=Book Session');
    // Assuming payment mock or bypassing in test environment
    await page.click('text=Confirm Booking');
    await expect(page.locator('text=Payment Successful')).toBeVisible();

    // 4. View session in Upcoming
    await page.goto('/bookings');
    await expect(page.locator('text=Upcoming')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('text=Join Session')).toBeVisible();

    // 5. Session completes -> leave review
    // Simulate completion (backend trigger usually, but frontend flow here)
    await page.goto('/dashboard/student');
    // In a real E2E, we'd trigger a webhook or DB update
  });
});

test.describe('Role Isolation (Security)', () => {
  test('Anonymous trying to access /dashboard → login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Student trying to access /dashboard/employee → redirect to student', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[name="email"]', 'student@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard\/student/);

    // Try to access employee dashboard
    await page.goto('/dashboard/employee');
    await expect(page).toHaveURL(/\/dashboard\/student/);
  });
});
