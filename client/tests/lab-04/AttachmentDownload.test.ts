import { afterEach, expect, it, vi } from 'vitest';
import { downloadAttachment } from '../../src/utils/downloadAttachment';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('downloads using the Bearer header and keeps the token out of the URL', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['file']) })));
  const create = vi.fn(() => 'blob:test'); const revoke = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await downloadAttachment(12, 'report.pdf', 'secret-token');
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(String(url)).toContain('/api/attachments/12/download'); expect(String(url)).not.toContain('secret-token');
  expect(init?.headers).toMatchObject({ Authorization: 'Bearer secret-token' });
  expect(click).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:test');
});
it('reports failures without creating a download', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
  await expect(downloadAttachment(12, 'report.pdf', 'token')).rejects.toThrow('403');
});
