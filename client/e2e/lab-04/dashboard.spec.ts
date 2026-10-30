import { test, expect } from '@playwright/test';

for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const) {
  test(`${role} can sign in and use its dashboard`, async ({ page }) => {
    const email = process.env[`E2E_${role}_EMAIL`];
    if (!email || !process.env.E2E_PASSWORD) throw new Error('Run using the isolated E2E runner.');
    await page.goto('/');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    if (role === 'REQUESTER') {
      await expect(page.getByRole('heading', { name: 'Total Tickets' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Ticket', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'View My Tickets' }).click();
      await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'My Pending Actions' })).toBeVisible();
      await page.getByRole('button', { name: 'View Active Tickets' }).click();
      await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible();
    }
    await page.getByRole('button', { name: /Sign Out/ }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
}
