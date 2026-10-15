import { describe, expect, it } from 'vitest';
import { actionBody, normalizeAction } from '../../src/utils/actionValidation';

describe('UNIT-01: action field normalization and conditional validation', () => {
  it.each([2, 2000])('accepts boundary %i with trimmed fields', length => {
    expect(normalizeAction({ description: ` ${'a'.repeat(length)} ` }, {}, 8).description).toHaveLength(length);
  });
  it.each([null, '', ' ', 'a', 'a'.repeat(2001), false, 9, {}])('rejects description %j', value => {
    expect(() => normalizeAction({ description: value }, {}, 8)).toThrow();
  });
  it('validates the merged completed/follow-up state instead of only changed fields', () => {
    expect(() => normalizeAction({ status: 'COMPLETED' }, { description: 'Inspect adapter', result: null }, 8)).toThrow();
    expect(() => normalizeAction({ followUpNote: '' }, { description: 'Inspect adapter', followUpRequired: true }, 8)).toThrow();
    expect(normalizeAction({ followUpRequired: false }, { description: 'Inspect adapter', followUpNote: 'Check tomorrow' }, 8).followUpNote).toBeNull();
  });
  it('rejects forged fields and wrong primitive types', () => {
    for (const field of ['ticketId', 'createdById', 'performedById', 'actionAt', 'version']) {
      expect(() => actionBody({ [field]: 1 }, true)).toThrow();
    }
    expect(() => normalizeAction({ description: 'Inspect adapter', followUpRequired: 'false' }, {}, 8)).toThrow();
    expect(() => normalizeAction({ description: 'Inspect adapter', assigneeId: 1.5 }, {}, 8)).toThrow();
  });
  it.each(['result', 'attachmentNotes', 'followUpNote', 'cancelReason'])('checks nonempty %s boundaries and types', field => {
    for (const value of ['a', 'a'.repeat(2001), true, 5, []]) {
      expect(() => normalizeAction({ description: 'Inspect adapter', [field]: value }, {}, 8)).toThrow();
    }
    for (const value of [null, '', ' ', 'a'.repeat(2), 'a'.repeat(2000)]) {
      expect(() => normalizeAction({ description: 'Inspect adapter', [field]: value }, {}, 8)).not.toThrow();
    }
  });
});
