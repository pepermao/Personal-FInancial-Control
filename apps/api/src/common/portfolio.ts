import { AssetType } from '@kevin/shared';

/**
 * FGC guarantees deposits and these credit instruments, up to R$250k per CPF per
 * institution. Treasury bonds, funds, stocks and FIIs are **not** covered — they carry
 * sovereign or market risk instead, so counting them here would overstate protection.
 */
export const FGC_COVERED_TYPES: ReadonlySet<string> = new Set([
  AssetType.CDB,
  AssetType.LCI,
  AssetType.LCA,
  AssetType.POUPANCA,
]);

export const FGC_LIMIT_PER_ISSUER = 250_000;

export interface PortfolioAsset {
  type: string;
  value: unknown;
  issuer?: string | null;
}

function amountOf(asset: PortfolioAsset): number {
  const value = Number(asset.value);
  return Number.isFinite(value) ? value : 0;
}

function share(part: number, whole: number): number {
  return whole ? Number(((part / whole) * 100).toFixed(2)) : 0;
}

export interface IssuerExposure {
  issuer: string;
  value: number;
  sharePct: number;
  /** Portion sitting in FGC-covered products. */
  fgcCovered: number;
  /** FGC-covered amount beyond the guarantee — at risk if the institution fails. */
  uninsuredExcess: number;
  /**
   * Room left under the guarantee, or null when the issuer holds nothing FGC-covered.
   *
   * Null rather than the full limit: the National Treasury issues no FGC-covered product,
   * so quoting R$250k of "headroom" against it would invite exactly the wrong conclusion.
   */
  headroom: number | null;
}

/**
 * Exposure per issuer, with FGC headroom.
 *
 * Assets without a recorded issuer are grouped under "Desconhecido" rather than dropped:
 * hiding them would make concentration look better than it is.
 */
export function issuerExposure(
  assets: PortfolioAsset[],
  limitPerIssuer = FGC_LIMIT_PER_ISSUER,
): IssuerExposure[] {
  const total = assets.reduce((sum, asset) => sum + amountOf(asset), 0);

  const byIssuer = new Map<string, { value: number; fgcCovered: number }>();
  for (const asset of assets) {
    const issuer = asset.issuer?.trim() || 'Desconhecido';
    const entry = byIssuer.get(issuer) ?? { value: 0, fgcCovered: 0 };
    const amount = amountOf(asset);
    entry.value += amount;
    if (FGC_COVERED_TYPES.has(asset.type)) entry.fgcCovered += amount;
    byIssuer.set(issuer, entry);
  }

  return Array.from(byIssuer.entries())
    .map(([issuer, entry]) => ({
      issuer,
      value: Number(entry.value.toFixed(2)),
      sharePct: share(entry.value, total),
      fgcCovered: Number(entry.fgcCovered.toFixed(2)),
      uninsuredExcess: Number(Math.max(0, entry.fgcCovered - limitPerIssuer).toFixed(2)),
      headroom:
        entry.fgcCovered > 0
          ? Number(Math.max(0, limitPerIssuer - entry.fgcCovered).toFixed(2))
          : null,
    }))
    .sort((a, b) => b.value - a.value);
}

export interface MaturityEntry {
  name: string;
  issuer: string | null;
  value: number;
  dueDate: string;
  daysUntil: number;
}

/** Holdings coming due within the horizon, soonest first. */
export function upcomingMaturities(
  assets: Array<PortfolioAsset & { name: string; dueDate?: Date | null }>,
  today: Date,
  horizonDays = 365,
): MaturityEntry[] {
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return assets
    .flatMap((asset) => {
      if (!asset.dueDate) return [];
      const due = asset.dueDate.getTime();
      if (Number.isNaN(due)) return [];
      const daysUntil = Math.round((due - startOfToday) / 86_400_000);
      if (daysUntil < 0 || daysUntil > horizonDays) return [];
      return [
        {
          name: asset.name,
          issuer: asset.issuer ?? null,
          value: Number(amountOf(asset).toFixed(2)),
          dueDate: asset.dueDate.toISOString().slice(0, 10),
          daysUntil,
        },
      ];
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
