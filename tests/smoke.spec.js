const { test, expect } = require('@playwright/test');

test('login page renders with Google sign-in button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  await expect(page.getByText('InterviewerOS', { exact: true })).toBeVisible();
});

test('login page shows Gmail access copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/sync your gmail inbox/i)).toBeVisible();
});
