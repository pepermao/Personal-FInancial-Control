import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { apiClient } from '../api/client';
import { Direction } from '@ledger/shared';
import type { CategoryDto, TransactionDto } from '@ledger/shared';
import { PeriodPicker, type PeriodType, monthStringToDate } from '../components/PeriodPicker';

async function fetchCategories() {
  const { data } = await apiClient.get<CategoryDto[]>('/categories');
  return data;
}

async function fetchTransactions() {
  const { data } = await apiClient.get<TransactionDto[]>('/transactions');
  return data;
}

export function CategoriesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });

  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [year, setYear] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);

  const months = (transactions ?? []).map((tx) => tx.competenceMonth);
  const earliestMonth = months.length ? months.reduce((a, b) => (a < b ? a : b)) : undefined;
  const latestMonth = months.length ? months.reduce((a, b) => (a > b ? a : b)) : undefined;
  const defaultYear = latestMonth?.slice(0, 4) ?? String(new Date().getFullYear());
  const effectiveYear = year ?? defaultYear;
  const effectiveMonth = month ?? latestMonth ?? `${effectiveYear}-01`;
  const minDate = earliestMonth ? monthStringToDate(earliestMonth) : undefined;
  const maxDate = new Date();

  const handlePeriodTypeChange = (value: PeriodType) => {
    if (value === periodType) return;
    if (value === 'month' && !month) setMonth(latestMonth ?? `${effectiveYear}-01`);
    if (value === 'year' && !year) setYear(defaultYear);
    setPeriodType(value);
  };

  const totalsByCategory = new Map<string, number>();
  for (const tx of transactions ?? []) {
    if (tx.direction !== Direction.EXPENSE || !tx.impactsDashboardExpense || !tx.categoryId) continue;
    if (periodType === 'year' && !tx.competenceMonth.startsWith(effectiveYear)) continue;
    if (periodType === 'month' && tx.competenceMonth !== effectiveMonth) continue;
    totalsByCategory.set(tx.categoryId, (totalsByCategory.get(tx.categoryId) ?? 0) + Number(tx.amount));
  }
  const topLevel = data?.filter((category) => !category.parentId) ?? [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Categorias</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            Padrões de gastos por categoria
          </Typography>
        </Box>
        {transactions && (
          <PeriodPicker
            periodType={periodType}
            year={effectiveYear}
            month={effectiveMonth}
            onPeriodTypeChange={handlePeriodTypeChange}
            onYearChange={setYear}
            onMonthChange={setMonth}
            minDate={minDate}
            maxDate={maxDate}
            showAllOption
          />
        )}
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as categorias.</Typography>}

      {data && (
        <Grid container spacing={2}>
          {topLevel.map((category) => {
            const total = totalsByCategory.get(category.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Paper sx={{ p: 2.25, height: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{category.name}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', mt: 1 }}>
                    {total ? `R$ ${total.toFixed(2)}` : 'R$ 0.00'}
                  </Typography>
                  {!total && (
                    <Typography sx={{ fontSize: 12, color: '#7A868E', mt: 0.5 }}>Nenhum gasto registrado</Typography>
                  )}
                </Paper>
              </Grid>
            );
          })}
          {topLevel.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: '#7A868E' }}>Nenhuma categoria ainda.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
