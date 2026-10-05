import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../api';

/**
 * Centralized cache invalidation. Every mutation that touches domain data should call one of
 * these instead of hand-crafting invalidateQueries — miss one and the UI goes stale.
 *
 * Prefix-matched: invalidating `['dashboard-summary']` clears all `['dashboard-summary', ...]` entries.
 */
export function useInvalidate() {
  const qc = useQueryClient();

  const transactions = () => qc.invalidateQueries({ queryKey: qk.transactions.all() });
  const categories = () => qc.invalidateQueries({ queryKey: qk.categories.all() });
  const accounts = () => qc.invalidateQueries({ queryKey: qk.accounts.all() });
  const banks = () => qc.invalidateQueries({ queryKey: qk.banks.all() });
  const assets = () => qc.invalidateQueries({ queryKey: qk.assets.all() });
  const rules = () => qc.invalidateQueries({ queryKey: qk.rules.all() });
  const openFinance = () => {
    qc.invalidateQueries({ queryKey: qk.openFinance.connections() });
    qc.invalidateQueries({ queryKey: qk.openFinance.status() });
  };
  const dashboard = () => {
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard-cash-flow'] });
    qc.invalidateQueries({ queryKey: qk.dashboard.netWorthHistory() });
  };

  /** Invalidate everything that could be affected by a transaction/category/account write. */
  const all = () => {
    transactions();
    categories();
    accounts();
    assets();
    rules();
    openFinance();
    dashboard();
  };

  return { transactions, categories, accounts, banks, assets, rules, openFinance, dashboard, all };
}
