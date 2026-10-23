import { describe, expect, it } from 'vitest';
import { approvedImagePermission } from './image-rights.mjs';

const grant = {
  bankId: 'bank',
  sourceUrl: 'https://bank.example/logo.png',
  status: 'approved',
  rightsHolder: 'Bank',
  grantReference: 'https://bank.example/permission',
  scope: ['local-copy', 'public-display', 'resize-webp'],
};
describe('разрешения банковских изображений', () => {
  it('разрешает только подходящее документированное использование', () => {
    expect(approvedImagePermission([grant], 'bank', grant.sourceUrl)).toBe(grant);
    expect(approvedImagePermission([grant], 'other', grant.sourceUrl)).toBeUndefined();
    expect(
      approvedImagePermission([grant], 'bank', 'https://mirror.example/logo.png'),
    ).toBeUndefined();
  });
  it('отклоняет отсутствие разрешения, доказательства, нужного объёма и истёкший срок', () => {
    for (const item of [
      { ...grant, status: 'not-established' },
      { ...grant, rightsHolder: '' },
      { ...grant, grantReference: '' },
      { ...grant, scope: ['public-display'] },
      { ...grant, expiresAt: '2026-01-01' },
    ]) {
      expect(
        approvedImagePermission([item], 'bank', grant.sourceUrl, '2026-10-23'),
      ).toBeUndefined();
    }
  });
});
