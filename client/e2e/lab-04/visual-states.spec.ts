import { assertNamedControls, test, expect, type Page, type TestInfo } from './browser-fixtures';

async function login(page: Page, role: 'REQUESTER' | 'IT_STAFF') {
  const email = process.env[`E2E_${role}_EMAIL`], password = process.env.E2E_PASSWORD;
  if (!email || !password) throw Error('Run using the isolated E2E runner');
  await page.goto('/'); await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await assertNamedControls(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), name).toBe(true);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}
for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
  for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
    test(`${role} dashboard loading, failure, retry and empty at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      const endpoint = `**/api/dashboard/${role === 'REQUESTER' ? 'requester' : 'staff'}`;
      let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
      let mode: 'loading' | 'failure' | 'empty' | 'normal' = 'loading';
      await page.route(endpoint, async route => {
        if (mode === 'loading') await gate;
        if (mode === 'failure') return route.fulfill({ status: 500, json: { error: { message: 'Fixture failure' } } });
        if (mode === 'empty') {
          const response = await route.fetch(); const data = await response.json();
          data.metrics = Object.fromEntries(Object.keys(data.metrics).map(key => [key, 0])); data.recentTickets = [];
          if (data.byStatus) data.byStatus = Object.fromEntries(Object.keys(data.byStatus).map(key => [key, 0]));
          if (data.byItPriority) data.byItPriority = Object.fromEntries(Object.keys(data.byItPriority).map(key => [key, 0]));
          if (data.myPendingActions) data.myPendingActions = { totalItems: 0, data: [] };
          return route.fulfill({ response, json: data });
        }
        return route.continue();
      });
      await login(page, role);
      await expect(page.getByRole('status').filter({ hasText: 'Loading dashboard' })).toBeVisible();
      await capture(page, info, 'dashboard-loading'); mode = 'failure'; release();
      await expect(page.getByRole('alert')).toContainText('Unable to load dashboard');
      await capture(page, info, 'dashboard-failure-initial');
      mode = 'normal'; await page.getByRole('button', { name: 'Retry' }).click();
      await expect(page.getByRole('heading', { name: 'Recent Tickets' })).toBeVisible();
      mode = 'failure'; await page.getByRole('button', { name: 'Refresh' }).click();
      await expect(page.getByRole('alert')).toContainText('Could not refresh');
      await capture(page, info, 'dashboard-failure-stale');
      mode = 'normal'; await page.getByRole('button', { name: 'Retry' }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      mode = 'empty'; await page.getByRole('button', { name: 'Refresh' }).click();
      await expect(page.getByText('No tickets yet.')).toBeVisible();
      if (role === 'IT_STAFF') await expect(page.getByText('No pending actions.')).toBeVisible();
      await capture(page, info, 'dashboard-empty-simulated');
    });
    test(`${role} action list loading, failure, retry and empty at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport); await login(page, role);
      await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
      let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
      let failing = true;
      await page.route('**/api/tickets/*/actions-taken?*', async route => {
        if (failing) { await gate; return route.fulfill({ status: 500, json: { error: { message: 'Fixture action failure' } } }); }
        return route.continue();
      });
      await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
      await expect(page.getByText('Loading Actions Taken...')).toBeVisible();
      await capture(page, info, 'actions-loading'); release();
      await expect(page.getByRole('alert')).toContainText('Fixture action failure');
      await capture(page, info, 'actions-failure');
      failing = false;
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByText('No actions recorded.')).toBeVisible();
      if (role === 'REQUESTER') await expect(page.getByRole('button', { name: 'Add Action' })).toHaveCount(0);
      await capture(page, info, 'actions-empty');
    });
  }
}

test('inactive assignee remains visible and must be reassigned before completion', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page, 'IT_STAFF');
  await page.getByRole('button', { name: `Open ${process.env.E2E_INACTIVE_TICKET_NUMBER}`, exact: true }).click();
  await page.getByRole('button', { name: 'Actions Taken', exact: true }).click();
  const action = page.locator('article').filter({ hasText: 'Historical inactive assignee action' });
  await expect(action).toContainText('Historical fixture staff (Inactive)');
  await action.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('dialog', { name: 'View Action' })).toContainText('Historical fixture staff (Inactive)');
  await capture(page, info, 'inactive-assignee-view');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await action.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByLabel('Assigned To')).toContainText('inactive or unavailable');
  await page.getByLabel('Status', { exact: true }).selectOption('COMPLETED');
  await page.getByLabel('Result').fill('Work finished');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Choose an active assignee' })).toBeVisible();
  await capture(page, info, 'inactive-assignee-validation');
  const select = page.getByLabel('Assigned To');
  await select.selectOption({ label: 'E2E IT_STAFF (It Staff)' });
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('button', { name: 'Confirm Completion' })).toBeVisible();
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
  for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
    test(`${role} collaboration failure and retry preserve drafts at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      const failing = { comments: true, notes: true };
      await page.route(/\/api\/tickets\/\d+\/(comments|notes)$/, async route => {
        const kind = route.request().url().endsWith('/notes') ? 'notes' : 'comments';
        if (failing[kind]) return route.fulfill({ status: 500, json: { error: { message: 'Fixture thread failure' } } });
        return route.continue();
      });
      await login(page, role);
      await page.getByRole('button', { name: `Open ${process.env.E2E_TICKET_NUMBER}`, exact: true }).click();
      if (role === 'IT_STAFF') {
        await expect(page.getByRole('combobox', { name: /Ticket Owner/ })).toBeVisible();
        await expect(page.getByRole('combobox', { name: /IT Priority/ })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Status Transition' })).toBeVisible();
        await page.getByTestId('tab-comments-btn').click();
      }
      await expect(page.getByRole('alert').filter({ hasText: 'Unable to load public comments' })).toBeVisible();
      await expect(page.getByText(/No (public comments|messages) (on|yet)/)).toHaveCount(0);
      const draft = page.getByTestId(role === 'IT_STAFF' ? 'public-comment-input' : 'requester-comment-input');
      await draft.fill('Preserve my conversation draft');
      await capture(page, info, 'comments-failure');
      failing.comments = false;
      await page.getByRole('button', { name: 'Retry public comments' }).click();
      await expect(page.getByRole('button', { name: 'Retry public comments' })).toHaveCount(0);
      await expect(draft).toHaveValue('Preserve my conversation draft');
      if (role === 'IT_STAFF') {
        await page.getByTestId('tab-notes-btn').click();
        await expect(page.getByRole('alert').filter({ hasText: 'Unable to load internal notes' })).toBeVisible();
        await expect(page.getByText('No internal notes recorded yet.')).toHaveCount(0);
        await page.getByTestId('internal-note-input').fill('Preserve my private draft');
        await capture(page, info, 'notes-failure');
        failing.notes = false;
        await page.getByRole('button', { name: 'Retry internal notes' }).click();
        await expect(page.getByRole('button', { name: 'Retry internal notes' })).toHaveCount(0);
        await expect(page.getByTestId('internal-note-input')).toHaveValue('Preserve my private draft');
      }
    });
  }
}
