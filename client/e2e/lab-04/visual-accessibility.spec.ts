import { assertNamedControls, chromium, test, expect, type Page, type TestInfo } from './browser-fixtures';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
async function inspect(page: Page, info: TestInfo, name: string, nativeZoom = false) {
  await assertNamedControls(page);
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll, `${name} has page-level horizontal overflow`).toBeLessThanOrEqual(sizes.width + 1);
  if (nativeZoom) {
    // Full-page emulation can change the viewport at native zoom. Capture the
    // browser's actual viewport without changing its device metrics instead.
    const session = await page.context().newCDPSession(page);
    try {
      const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(info.outputPath(`${name}.png`), Buffer.from(data, 'base64'));
    } finally { await session.detach(); }
  } else await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
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
  test(`${role} dashboard and actions with native 200% browser zoom`, async ({ browserName }, info) => {
    expect(browserName).toBe('chromium');
    // Browser settings need a persistent context. Use a disposable profile so the
    // user's zoom preferences and other tests' profiles are never changed.
    const profile = mkdtempSync(join(tmpdir(), 'toktickit-native-zoom-'));
    let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
    try {
      context = await chromium.launchPersistentContext(profile, {
        ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}),
        headless: true, viewport: null, baseURL: 'http://localhost:5173', args: ['--window-size=1280,800'],
      });
      const settings = await context.newPage();
      await settings.goto('chrome://settings/appearance');
      const configuredZoom = await settings.evaluate(async () => {
        const api = (window as unknown as { chrome: { settingsPrivate: {
          setDefaultZoom: (zoom: number) => Promise<void>; getDefaultZoom: () => Promise<number>;
        } } }).chrome.settingsPrivate;
        await api.setDefaultZoom(2);
        return api.getDefaultZoom();
      });
      expect(configuredZoom).toBe(2);
      await settings.close();
      const page = await context.newPage();
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await login(page, role);
      await expect(page.getByRole('heading', { name: 'Recent Tickets' })).toBeVisible();
      const geometry = await page.evaluate(() => ({ inner: innerWidth,
        dpr: devicePixelRatio, cssZoom: getComputedStyle(document.documentElement).zoom }));
      expect(geometry.cssZoom).toBe('1');
      expect(geometry.dpr).toBe(2);
      // Browser window bounds remain authoritative when a privacy browser
      // rounds DOM outerWidth. Verify the physical/CSS ratio independently.
      const windowSession = await context.newCDPSession(page);
      const { bounds } = await windowSession.send('Browser.getWindowForTarget');
      await windowSession.detach();
      expect(bounds.width).toBe(1280);
      expect(bounds.width! / geometry.inner).toBeCloseTo(2, 1);
      await inspect(page, info, 'native-zoom-dashboard', true);
      await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
      await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
      await expect(page.getByText('No actions recorded.')).toBeVisible();
      await inspect(page, info, 'native-zoom-actions', true);
      if (role === 'IT_STAFF') {
        await page.getByRole('button', { name: 'Add Action' }).click();
        const save = page.getByRole('button', { name: 'Save Action' });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport({ ratio: 1 });
        expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await inspect(page, info, 'native-zoom-dialog', true);
      }
      expect(errors).toEqual([]);
    } finally {
      await context?.close();
      rmSync(profile, { recursive: true, force: true });
    }
  });
}
