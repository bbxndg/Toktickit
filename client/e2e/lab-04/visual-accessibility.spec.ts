import { test, expect, type Page, type TestInfo } from '@playwright/test';

const viewports = [
  { width: 1280, height: 800 }, { width: 820, height: 1180 },
  { width: 390, height: 844 }, { width: 320, height: 800 },
];
async function login(page: Page, role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR') {
  const email = process.env[`E2E_${role}_EMAIL`];
  if (!email || !process.env.E2E_PASSWORD) throw Error('Run using the isolated E2E runner.');
  await page.goto('/');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
async function inspect(page: Page, info: TestInfo, name: string) {
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll, `${name} has page-level horizontal overflow`).toBeLessThanOrEqual(sizes.width + 1);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}
for (const viewport of viewports) {
  test(`staff screens at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await login(page, 'IT_STAFF');
    await expect(page.getByRole('heading', { name: 'My Pending Actions' })).toBeVisible();
    await inspect(page, info, 'staff-dashboard');
    await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
    const ticketNumber = page.getByTestId('ticket-details-card').locator('.font-monospace');
    expect(await ticketNumber.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Action' })).toBeVisible();
    await inspect(page, info, 'staff-actions');
    await page.getByRole('button', { name: 'Add Action' }).click();
    await page.getByRole('button', { name: 'Save Action' }).click();
    await expect(page.getByLabel('Action Description')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('dialog', { name: 'Create Action' })).toBeVisible();
    await inspect(page, info, 'action-validation');
    const save = page.getByRole('button', { name: 'Save Action' });
    await save.scrollIntoViewIfNeeded();
    const rect = await save.boundingBox();
    expect(rect && rect.y >= 0 && rect.y + rect.height <= viewport.height).toBe(true);
    await inspect(page, info, 'action-dialog-footer');
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'Status History' }).click();
    await inspect(page, info, 'status-history');
    await page.getByTestId('nav-ticket-queue').click();
    await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible();
    await inspect(page, info, 'ticket-queue');
  });
  test(`requester screens at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await login(page, 'REQUESTER');
    await expect(page.getByRole('heading', { name: 'Total Tickets' })).toBeVisible();
    await inspect(page, info, 'requester-dashboard');
    await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
    await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Action' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Internal Notes/ })).toHaveCount(0);
    await inspect(page, info, 'requester-actions');
    await page.getByTestId('nav-create-ticket').click();
    await expect(page.getByTestId('ticket-summary-input')).toBeVisible();
    await inspect(page, info, 'create-ticket');
    await page.getByTestId('nav-my-tickets').click();
    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await inspect(page, info, 'my-tickets');
  });
}
test('administrator user management at mobile width', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page, 'ADMINISTRATOR');
  await page.getByTestId('nav-user-management').click();
  await expect(page.getByRole('heading', { name: /User Management/ })).toBeVisible();
  await inspect(page, info, 'user-management');
});

for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
  test(`${role} dashboard and actions with 200% CSS zoom`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 }); await login(page, role);
    await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe('2');
    await inspect(page, info, 'zoomed-dashboard');
    await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
    await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
    await inspect(page, info, 'zoomed-actions');
    if (role === 'IT_STAFF') {
      await page.getByRole('button', { name: 'Add Action' }).click();
      await expect(page.getByRole('button', { name: 'Save Action' })).toBeVisible();
      await inspect(page, info, 'zoomed-dialog');
    }
  });
}
