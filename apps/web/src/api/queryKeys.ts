/**
 * Central registry of React Query keys. All queryKey / invalidateQueries calls in the app
 * should reference these helpers so refactors and typos have a single point of failure.
 *
 * Convention: use functions (not constants) even for keys without params, so the pattern is
 * uniform and future params can be added without touching call sites.
 */
export const qk = {
  transactions: {
    all: () => ['transactions'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
  accounts: {
    all: () => ['accounts'] as const,
  },
  banks: {
    all: () => ['banks'] as const,
  },
  assets: {
    all: () => ['assets'] as const,
  },
  rules: {
    all: () => ['rules'] as const,
  },
  openFinance: {
    connections: () => ['open-finance-connections'] as const,
    status: () => ['open-finance-status'] as const,
  },
  dashboard: {
    /** period is `'year:2026'` or `'month:2026-06'` or `'default'` — stable string for cache. */
    summary: (period: string) => ['dashboard-summary', period] as const,
    cashFlow: (period: string) => ['dashboard-cash-flow', period] as const,
    netWorthHistory: () => ['dashboard-net-worth-history'] as const,
  },
};

/** Build a stable period key from optional month/year. */
export function periodKey(month?: string, year?: string): string {
  if (month) return `month:${month}`;
  if (year) return `year:${year}`;
  return 'default';
}
