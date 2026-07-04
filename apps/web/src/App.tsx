import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { AccountsPage } from './pages/Accounts';
import { AssetsPage } from './pages/Assets';
import { CategoriesPage } from './pages/Categories';
import { RulesPage } from './pages/Rules';
import { ImportsPage } from './pages/Imports';
import { SettingsPage } from './pages/Settings';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
