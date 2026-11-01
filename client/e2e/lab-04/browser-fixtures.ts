import { test as base, expect, type Page } from '@playwright/test';
export { expect, chromium } from '@playwright/test';
export type { Page, TestInfo } from '@playwright/test';

// Network failures are deliberately exercised by several tests. Uncaught page
// exceptions are never expected, including in secondary tabs or popups.
export const test = base.extend<{ browserRuntimeCheck: void }>({
  browserRuntimeCheck: [async ({ context }, use) => {
    const errors: string[] = [];
    const track = (page: Page) => page.on('pageerror', error => errors.push(error.message));
    context.pages().forEach(track);
    context.on('page', track);
    await use();
    context.off('page', track);
    expect(errors, 'Uncaught JavaScript errors in browser pages').toEqual([]);
  }, { auto: true }],
});

export async function assertNamedControls(page: Page) {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const interactive = new Set(['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'switch', 'spinbutton']);
    const unnamed = nodes.filter(node => !node.ignored && interactive.has(String(node.role?.value)) && !String(node.name?.value || '').trim())
      .map(node => ({ role: node.role?.value, node: node.backendDOMNodeId }));
    expect(unnamed, 'Every exposed interactive control needs an accessible name').toEqual([]);
  } finally { await session.detach(); }
}
