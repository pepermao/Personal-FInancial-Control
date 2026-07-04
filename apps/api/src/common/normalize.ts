import { createHash } from 'crypto';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function normalizeDescription(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildFingerprint(
  accountId: string,
  date: Date,
  amount: string | number,
  descriptionNormalized: string,
): string {
  const datePart = date.toISOString().slice(0, 10);
  const raw = `${accountId}|${datePart}|${amount}|${descriptionNormalized}`;
  return createHash('sha256').update(raw).digest('hex');
}
