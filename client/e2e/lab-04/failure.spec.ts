import { assertNamedControls, test, expect, type Page } from './browser-fixtures';

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

for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
for (const initialStatus of ['PLANNED', 'COMPLETED'] as const) {
test(`lost create response retries without duplicates (${initialStatus}) at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await openTicket(page, true);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill(`Lost response retry fixture ${viewport.width} ${initialStatus}`);
  let dropped = false;
  await page.route('**/api/staff/tickets/*/actions-taken', async route => {
    if (!dropped && route.request().method() === 'POST') {
      dropped = true;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed');
    } else await route.continue();
  });
  if (initialStatus === 'COMPLETED') {
    await page.getByLabel('Status', { exact: true }).selectOption('COMPLETED');
    await page.getByLabel('Result', { exact: false }).fill('Verified before the response was lost');
  }
  await page.getByRole('button', { name: 'Save Action' }).click();
  if (initialStatus === 'COMPLETED') await page.getByRole('button', { name: 'Confirm Completion' }).click();
  await expect(page.getByText('Save result could not be confirmed. Retry the previous save to check it safely.')).toBeVisible();
  await expect(page.getByLabel('Action Description')).toHaveValue(`Lost response retry fixture ${viewport.width} ${initialStatus}`);
  await page.getByRole('button', { name: 'Retry Previous Save' }).click();
  await expect(page.getByText('Previous save confirmed. No duplicate action was created.')).toBeVisible();
  await expect(page.locator('tr:visible, article:visible').filter({ hasText: `Lost response retry fixture ${viewport.width} ${initialStatus}` })).toHaveCount(1);
});

}

test(`stale edits preserve draft through explicit reload at ${viewport.width}px`, async ({ page, context }, info) => {
  await page.setViewportSize(viewport);
  await openTicket(page, true);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Action Description').fill(`Concurrent editing fixture ${viewport.width}`);
  await page.getByRole('button', { name: 'Save Action' }).click();
  const row = page.locator('tr:visible, article:visible').filter({ hasText: `Concurrent editing fixture ${viewport.width}` });
  await expect(row).toBeVisible();
  const second = await context.newPage();
  await second.setViewportSize(viewport);
  await openTicket(second, false);
  await second.locator('tr:visible, article:visible').filter({ hasText: `Concurrent editing fixture ${viewport.width}` }).getByRole('button', { name: 'Edit' }).click();
  await second.getByLabel('Action Description').fill(`Second tab draft remains ${viewport.width}`);
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Action Description').fill(`First tab saved edit ${viewport.width}`);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.locator('tr:visible, article:visible').filter({ hasText: `First tab saved edit ${viewport.width}` })).toBeVisible();
  await second.getByRole('button', { name: 'Save Changes' }).click();
  await expect(second.getByRole('button', { name: 'Reload Latest' })).toBeVisible();
  await expect(second.getByLabel('Action Description')).toHaveValue(`Second tab draft remains ${viewport.width}`);
  await second.getByRole('button', { name: 'Reload Latest' }).scrollIntoViewIfNeeded();
  await assertNamedControls(second);
  await second.screenshot({ path: info.outputPath('action-conflict.png'), fullPage: true });
  await second.getByRole('button', { name: 'Reload Latest' }).click();
  await expect(second.getByLabel('Action Description')).toHaveValue(`Second tab draft remains ${viewport.width}`);
  await second.getByRole('button', { name: 'Save Changes' }).click();
  await expect(second.locator('tr:visible, article:visible').filter({ hasText: `Second tab draft remains ${viewport.width}` })).toBeVisible();
  await second.close();
});

}
