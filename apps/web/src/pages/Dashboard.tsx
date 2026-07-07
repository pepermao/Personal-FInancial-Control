import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { dashboardApi, periodKey, qk } from '../api';
import { PeriodPicker, type PeriodType, monthStringToDate } from '../components/PeriodPicker';
import { formatBRL } from '../utils/format';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

  const params = periodType === 'month' ? { month } : { year };
  const cacheKey = periodKey(params.month, params.year);

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.dashboard.summary(cacheKey),
    queryFn: () => dashboardApi.summary(params),
  });

  const { data: cashFlow } = useQuery({
    queryKey: qk.dashboard.cashFlow(cacheKey),
    queryFn: () => dashboardApi.cashFlow(params),
    enabled: Boolean(data),
  });

  const { data: netWorthHistory } = useQuery({
    queryKey: qk.dashboard.netWorthHistory(),
    queryFn: dashboardApi.netWorthHistory,
  });

  const maxCategoryTotal = data ? Math.max(1, ...data.byCategory.map((c) => Number(c.total))) : 1;
  const cashFlowLabels = cashFlow
    ? cashFlow.series.map((point) =>
        cashFlow.granularity === 'month' ? MONTH_LABELS[Number(point.label) - 1] : String(Number(point.label)),
      )
    : [];
  const minDate = data?.earliestMonth ? monthStringToDate(data.earliestMonth) : undefined;
  const maxDate = new Date();

  const netWorthLabels = netWorthHistory
    ? netWorthHistory.series.map((point) => MONTH_LABELS[Number(point.label.slice(5, 7)) - 1])
    : [];
  const netWorthValues = netWorthHistory ? netWorthHistory.series.map((point) => Number(point.netWorth)) : [];
  const netWorthChange =
    netWorthValues.length > 1 ? netWorthValues[netWorthValues.length - 1] - netWorthValues[0] : 0;

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
              <KpiCard label="Patrimônio líquido" value={formatBRL(data.netWorth)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Total em contas" value={formatBRL(data.totalAccountsBalance)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Renda no período" value={formatBRL(data.totalIncome)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Custo de vida" value={formatBRL(data.totalExpense)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Fluxo de caixa" value={formatBRL(data.balance)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Investimentos" value={formatBRL(data.totalInvestments)} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard label="Imóveis" value={formatBRL(data.totalRealEstate)} />
            </Grid>
          </Grid>

          {netWorthHistory && netWorthValues.length > 0 && (
            <Paper sx={{ p: 2.5, mt: 2 }}>
              <Typography variant="h6" sx={{ fontSize: 16 }}>
                Patrimônio líquido
              </Typography>
              <Typography sx={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', mt: 0.5 }}>
                {formatBRL(netWorthValues[netWorthValues.length - 1])}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                {netWorthChange >= 0 ? (
                  <ArrowUpwardIcon sx={{ fontSize: 14, color: '#0E9D63' }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 14, color: '#C7443F' }} />
                )}
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: netWorthChange >= 0 ? '#0E9D63' : '#C7443F' }}>
                  {formatBRL(Math.abs(netWorthChange))}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#7A868E' }}>nos últimos 12 meses</Typography>
              </Stack>
              <LineChart
                height={280}
                series={[
                  {
                    data: netWorthValues,
                    area: true,
                    color: '#0E9D63',
                    showMark: false,
                  },
                ]}
                xAxis={[{ data: netWorthLabels, scaleType: 'point' }]}
                grid={{ horizontal: true }}
                sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.15 } }}
                slotProps={{ legend: { hidden: true } }}
              />
            </Paper>
          )}

          {cashFlow && (
            <Paper sx={{ p: 2.5, mt: 2 }}>
              <Typography variant="h6" sx={{ fontSize: 16, mb: 1 }}>
                {cashFlow.granularity === 'day' ? 'Fluxo de caixa diário' : 'Fluxo de caixa mensal'}
              </Typography>
              <BarChart
                height={280}
                series={[
                  {
                    data: cashFlow.series.map((point) => Number(point.income) - Number(point.expense)),
                    label: 'Resultado',
                  },
                ]}
                xAxis={
                  [
                    {
                      data: cashFlowLabels,
                      scaleType: 'band',
                      categoryGapRatio: 0.1,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ] as any
                }
                yAxis={
                  [
                    {
                      colorMap: {
                        type: 'piecewise',
                        thresholds: [0],
                        colors: ['#C7443F', '#0E9D63'],
                      },
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ] as any
                }
                grid={{ horizontal: true }}
                slotProps={{ legend: { hidden: true } }}
              />
            </Paper>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontSize: 16, mb: 1 }}>
                  Receitas vs. despesas
                </Typography>
                {cashFlow && (
                  <BarChart
                    height={280}
                    series={[
                      {
                        data: cashFlow.series.map((point) => Number(point.income)),
                        label: 'Receita',
                        color: '#0E9D63',
                      },
                      {
                        data: cashFlow.series.map((point) => Number(point.expense)),
                        label: 'Despesa',
                        color: '#C7443F',
                      },
                    ]}
                    xAxis={[
                      {
                        data: cashFlowLabels,
                        scaleType: 'band',
                      },
                    ]}
                    grid={{ horizontal: true }}
                  />
                )}
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
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatBRL(category.total)}</Typography>
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

          <Paper sx={{ p: 2.5, mt: 2 }}>
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
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{formatBRL(account.balance)}</Typography>
                </Stack>
              ))}
              {data.byAccount.length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#7A868E' }}>Nenhuma conta ainda.</Typography>
              )}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}
