import { test, expect, type Page } from '@playwright/test';
import { generateTestUser, apiRegisterAndLogin, apiLogin } from './helpers/auth';

// Shared test user across the sequential test suite
let testUser: ReturnType<typeof generateTestUser>;

test.describe('Two-step registration flow', () => {
  test.beforeAll(() => {
    testUser = generateTestUser();
  });

  test('1 - landing page loads with key elements', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('EduResearch').first()).toBeVisible();
    await expect(page.getByText('Start shipping research.')).toBeVisible();
    await expect(page.getByRole('link', { name: /login/i }).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /get started free/i }).first(),
    ).toBeVisible();
  });

  test('2 - email registration redirects to onboarding', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: /create account/i }),
    ).toBeVisible();

    // Fill registration form (inputs have no htmlFor, use type-based selectors)
    const textInputs = page.locator('form input[type="text"]');
    await textInputs.nth(0).fill(testUser.first_name); // First Name
    await textInputs.nth(1).fill(testUser.last_name); // Last Name

    await page.locator('form input[type="email"]').fill(testUser.email);

    const passwordInputs = page.locator('form input[type="password"]');
    await passwordInputs.nth(0).fill(testUser.password); // Password
    await passwordInputs.nth(1).fill(testUser.password); // Confirm Password

    await page.getByRole('button', { name: /create account/i }).click();

    // Register auto-logs in, then ProtectedRoute redirects to /onboarding
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
    await expect(page.getByText('Welcome to EduResearch')).toBeVisible();
  });

  test('3 - onboarding: create team redirects to dashboard', async ({
    page,
  }) => {
    await loginViaUI(page, testUser.email, testUser.password);
    await page.waitForURL('**/onboarding', { timeout: 30_000 });

    // "Create a new team" should be the default mode
    await expect(page.getByText('Create a new team')).toBeVisible();

    // Fill team name
    await page
      .locator('form input[type="text"]')
      .fill(`E2E Lab ${Date.now()}`);

    await page.getByRole('button', { name: /create team/i }).click();

    // Should redirect to dashboard after onboarding
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('4 - login with onboarded user goes to dashboard', async ({ page }) => {
    await loginViaUI(page, testUser.email, testUser.password);

    // User has enterprise_id now, should go straight to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('5 - user without enterprise is redirected to onboarding', async ({
    page,
  }) => {
    // Register a second user via API (no enterprise)
    const secondUser = generateTestUser();
    const token = await apiRegisterAndLogin(secondUser);

    // Inject token into localStorage
    await page.goto('/');
    await page.evaluate(
      (t) => {
        localStorage.setItem('token', t);
        localStorage.setItem('isPlatformAdmin', 'false');
      },
      token,
    );

    // Navigate to a protected route
    await page.goto('/dashboard');

    // Should be redirected to onboarding (no enterprise_id)
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
    await expect(page.getByText('Welcome to EduResearch')).toBeVisible();
  });

  test('6 - onboarded user navigating to /onboarding is redirected to dashboard', async ({
    page,
  }) => {
    // Use API login + token injection to avoid potential rate-limiting from repeated UI logins
    const token = await apiLogin(testUser.email, testUser.password);

    await page.goto('/');
    await page.evaluate(
      (t) => {
        localStorage.setItem('token', t);
        localStorage.setItem('isPlatformAdmin', 'false');
      },
      token,
    );

    // Navigate directly to /onboarding — should redirect to /dashboard since user has enterprise_id
    await page.goto('/onboarding');
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await page.locator('form input[type="email"]').fill(email);
  await page.locator('form input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}
