import { test, expect } from './browser-fixtures';

async function contrast(page: import('@playwright/test').Page, selector: string) {
  return page.locator(selector).evaluate(element => {
    const rgba = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const fg = rgba(getComputedStyle(element).color);
    let bg = [255, 255, 255]; const layers: number[][] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const color = rgba(getComputedStyle(node).backgroundColor); if ((color[3] ?? 1) > 0) layers.unshift(color);
    }
    for (const color of layers) { const a = color[3] ?? 1; bg = bg.map((value, i) => color[i] * a + value * (1 - a)); }
    const luminance = (c: number[]) => c.slice(0, 3).map(x => { const n = x / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; })
      .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
    const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  });
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
  test(`requester dashboard at ${viewport.width}px`, async ({ page }) => {
    const email = process.env.E2E_REQUESTER_EMAIL;
    if (!email || !process.env.E2E_PASSWORD) throw new Error('Run using the isolated E2E runner.');
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Total Tickets' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    if (viewport.width < 768) {
      const undersized = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
        const rect = button.getBoundingClientRect(); return rect.width < 44 || rect.height < 44;
      }).map(button => button.textContent));
      expect(undersized).toEqual([]);
    }
    await expect(page.getByRole('button', { name: 'Create Ticket', exact: true })).toBeVisible();
  });
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
  test(`staff dashboard at ${viewport.width}px`, async ({ page }, testInfo) => {
    const email = process.env.E2E_IT_STAFF_EMAIL;
    if (!email || !process.env.E2E_PASSWORD) throw new Error('Run using the isolated E2E runner.');
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'My Pending Actions' })).toBeVisible();
    expect(await contrast(page, '[data-testid="sign-out-btn"]')).toBeGreaterThanOrEqual(4.5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    if (viewport.width < 768) {
      const undersized = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
        const rect = button.getBoundingClientRect(); return rect.width < 44 || rect.height < 44;
      }).map(button => button.textContent));
      expect(undersized).toEqual([]);
    }
    await page.screenshot({ path: testInfo.outputPath('staff-dashboard.png'), fullPage: true });
  });
}

test('status and priority badge text meets normal-text contrast', async ({ page }) => {
  await page.goto('/');
  const classes = ['badge-zg-priority-low', 'badge-zg-priority-medium', 'badge-zg-priority-high',
    'badge-zg-status-new', 'badge-zg-status-inprogress', 'badge-zg-status-resolved',
    'action-status-planned', 'action-status-in_progress', 'action-status-completed', 'action-status-cancelled'];
  await page.evaluate(names => {
    for (const name of names) { const badge = document.createElement('span'); badge.className = name; badge.dataset.contrast = name; badge.textContent = name; document.body.appendChild(badge); }
  }, classes);
  for (const name of classes) expect(await contrast(page, `[data-contrast="${name}"]`), name).toBeGreaterThanOrEqual(4.5);
});
