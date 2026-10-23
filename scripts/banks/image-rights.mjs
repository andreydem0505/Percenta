import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/** An alternative download URL is not a rights grant from a bank. */
export function approvedImagePermission(
  permissions,
  bankId,
  sourceUrl,
  today = new Date().toISOString().slice(0, 10),
) {
  return permissions.find(
    (item) =>
      item.bankId === bankId &&
      item.sourceUrl === sourceUrl &&
      /^https:\/\//.test(sourceUrl) &&
      item.status === 'approved' &&
      typeof item.rightsHolder === 'string' &&
      item.rightsHolder.trim() &&
      typeof item.grantReference === 'string' &&
      /^https:\/\//.test(item.grantReference) &&
      Array.isArray(item.scope) &&
      ['local-copy', 'public-display', 'resize-webp'].every((scope) =>
        item.scope.includes(scope),
      ) &&
      (!item.expiresAt || item.expiresAt >= today),
  );
}

export async function refreshImageRights(images, permissions) {
  const destination = new URL('./provenance/logo-rights.json', import.meta.url);
  const previous = JSON.parse(await readFile(destination, 'utf8'));
  const updated = await Promise.all(
    images.map(async ({ id, name, source }) => {
      const grant = approvedImagePermission(permissions, id, source);
      const bytes = await readFile(`public/banks/${id}.webp`);
      return {
        bankId: id,
        name,
        file: `banks/${id}.webp`,
        sourceUrl: source,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        sourceKind:
          new URL(source).hostname === 'qr.nspk.ru'
            ? 'nspk'
            : new URL(source).hostname === 'raw.githubusercontent.com'
              ? 'rblp'
              : 'bank-website',
        permissionStatus: grant ? 'approved' : 'not-established',
        ...(grant
          ? { rightsHolder: grant.rightsHolder, grantReference: grant.grantReference }
          : {}),
        basis: grant
          ? 'Documented grant recorded by the project owner; verify its applicability before release.'
          : 'Public source is not an authorization. Kept at the owner’s explicit request.',
      };
    }),
  );
  const approved = updated.filter((image) => image.permissionStatus === 'approved').length;
  await writeFile(
    destination,
    JSON.stringify(
      {
        version: 1,
        reviewedAt: previous.reviewedAt,
        inventoryUpdatedAt: new Date().toISOString(),
        summary: {
          images: updated.length,
          confirmedGrants: approved,
          notEstablished: updated.length - approved,
        },
        sourceChecks: previous.sourceChecks,
        images: updated,
      },
      null,
      2,
    ) + '\n',
  );
}
