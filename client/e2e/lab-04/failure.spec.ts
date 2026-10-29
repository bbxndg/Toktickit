import { test, expect, type Page } from '@playwright/test';

async function openTicket(page: Page, login: boolean) {
  await page.goto('/');
  if (login) {
    await page.getByLabel('Email Address').fill(process.env.E2E_IT_STAFF_EMAIL!);
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
  }
  await page.getByRole('button', { name: `Open ${process.env.E2E_FAILURE_TICKET_NUMBER}`, exact: true }).click();
  await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
}

test('lost create response retries safely without duplicating the action', async ({ page }) => {
  await openTicket(page, true);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Lost response retry fixture');
  let dropped = false;
  await page.route('**/api/staff/tickets/*/actions-taken', async route => {
    if (!dropped && route.request().method() === 'POST') {
      dropped = true;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Save result could not be confirmed. Retry the previous save to check it safely.')).toBeVisible();
  await expect(page.getByLabel('Action Description')).toHaveValue('Lost response retry fixture');
  await page.getByRole('button', { name: 'Retry Previous Save' }).click();
  await expect(page.getByText('Previous save confirmed. No duplicate action was created.')).toBeVisible();
  await expect(page.locator('tr').filter({ hasText: 'Lost response retry fixture' })).toHaveCount(1);
});

test('stale edits preserve draft until latest data is reloaded and reviewed', async ({ page, context }, info) => {
  await openTicket(page, true);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill('Concurrent editing fixture');
  await page.getByRole('button', { name: 'Save Action' }).click();
  const row = page.locator('tr').filter({ hasText: 'Concurrent editing fixture' });
  await expect(row).toBeVisible();
  const second = await context.newPage();
  await openTicket(second, false);
  await second.locator('tr').filter({ hasText: 'Concurrent editing fixture' }).getByRole('button', { name: 'Edit' }).click();
  await second.getByLabel('Action Description').fill('Second tab draft remains');
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Action Description').fill('First tab saved edit');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('First tab saved edit').first()).toBeVisible();
  await second.getByRole('button', { name: 'Save Changes' }).click();
  await expect(second.getByRole('button', { name: 'Reload Latest' })).toBeVisible();
  await expect(second.getByLabel('Action Description')).toHaveValue('Second tab draft remains');
  await second.getByRole('button', { name: 'Reload Latest' }).scrollIntoViewIfNeeded();
  await second.screenshot({ path: info.outputPath('action-conflict.png'), fullPage: true });
  await second.getByRole('button', { name: 'Reload Latest' }).click();
  await expect(second.getByLabel('Action Description')).toHaveValue('Second tab draft remains');
  await second.getByRole('button', { name: 'Save Changes' }).click();
  await expect(second.getByText('Second tab draft remains').first()).toBeVisible();
  await second.close();
});
