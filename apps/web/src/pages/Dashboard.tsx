import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { apiClient } from '../api/client';
import type { DashboardSummaryDto } from '@ledger/shared';
import { PeriodPicker, type PeriodType, monthStringToDate } from '../components/PeriodPicker';

async function fetchSummary(params: { year?: string; month?: string }) {
  const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary', { params });
  return data;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ p: 2.25, height: '100%' }}>
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#98A2A9', textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', mt: 0.5 }}>{value}</Typography>
    </Paper>
  );
}

export function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [year, setYear] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary', periodType, periodType === 'month' ? (month ?? 'default') : (year ?? 'default')],
    queryFn: () => fetchSummary(periodType === 'month' ? { month } : { year }),
  });

  const maxCategoryTotal = data ? Math.max(1, ...data.byCategory.map((c) => Number(c.total))) : 1;
  const minDate = data?.earliestMonth ? monthStringToDate(data.earliestMonth) : undefined;
  const maxDate = new Date();

  const handlePeriodTypeChange = (value: PeriodType) => {
    if (value === periodType) return;
    if (value === 'month' && !month) {
      setMonth(data?.month ?? `${data?.year ?? maxDate.getFullYear()}-01`);
    }
    if (value === 'year' && !year && data?.year) {
      setYear(data.year);
    }
    setPeriodType(value);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Painel</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            Sua posição financeira num relance
          </Typography>
        </Box>
        {data && (
          <PeriodPicker
            periodType={periodType}
            year={year ?? data.year}
            month={month ?? data.month ?? `${data.year}-01`}
            onPeriodTypeChange={handlePeriodTypeChange}
            onYearChange={setYear}
            onMonthChange={setMonth}
            minDate={minDate}
            maxDate={maxDate}
          />
        )}
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar o resumo.</Typography>}

      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Patrimônio líquido" value={`R$ ${data.netWorth}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Renda no período" value={`R$ ${data.totalIncome}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Custo de vida" value={`R$ ${data.totalExpense}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Fluxo de caixa" value={`R$ ${data.balance}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Investimentos" value={`R$ ${data.totalInvestments}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Imóveis" value={`R$ ${data.totalRealEstate}`} />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>
                  Contas
                </Typography>
                <Stack divider={<Box sx={{ borderBottom: '1px solid #F1F3F5' }} />} spacing={1.25}>
                  {data.byAccount.map((account) => (
                    <Stack
                      key={account.accountId}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 0.5 }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{account.accountName}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#7A868E' }}>{account.bankName}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>R$ {account.balance}</Typography>
                    </Stack>
                  ))}
                  {data.byAccount.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>Nenhuma conta ainda.</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>
                  Gastos por categoria
                </Typography>
                <Stack spacing={1.5}>
                  {data.byCategory.map((category) => (
                    <Box key={category.categoryId ?? 'uncategorized'}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{category.categoryName}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>R$ {category.total}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(Number(category.total) / maxCategoryTotal) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#F1F3F5',
                          '& .MuiLinearProgress-bar': { backgroundColor: '#16202A', borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                  {data.byCategory.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>Nenhuma despesa neste período.</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
