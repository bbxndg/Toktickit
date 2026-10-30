import { describe, expect, it, vi } from 'vitest';
import { fileFilter } from '../../src/utils/fileUpload';

describe('Multipart filename preservation', () => {
  it.each(['รายงานการทดสอบ.pdf', 'café.pdf', '作業記録.pdf', 'repair-🔧.pdf', 'report.pdf'])('recovers browser UTF-8 bytes for %s', name => {
    const file = { originalname: Buffer.from(name, 'utf8').toString('latin1'), mimetype: 'application/pdf' } as Express.Multer.File;
    const callback = vi.fn(); fileFilter({}, file, callback);
    expect(file.originalname).toBe(name); expect(callback).toHaveBeenCalledWith(null, true);
  });
  it.each(['รายงาน.pdf', 'repair-🔧.pdf', 'café.pdf', 'report.pdf'])('preserves already decoded or Latin-1 %s', name => {
    const file = { originalname: name, mimetype: 'application/pdf' } as Express.Multer.File;
    fileFilter({}, file, vi.fn()); expect(file.originalname).toBe(name);
  });
  it('still rejects unsupported file types after decoding their filename', () => {
    const callback = vi.fn(); fileFilter({}, { originalname: 'file.exe', mimetype: 'application/octet-stream' } as Express.Multer.File, callback);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
