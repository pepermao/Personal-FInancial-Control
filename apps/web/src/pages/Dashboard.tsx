import { useQuery } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { apiClient } from '../api/client';
import type { DashboardSummaryDto } from '@ledger/shared';

async function fetchSummary(month: string) {
  const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary', {
    params: { month },
  });
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
  const month = new Date().toISOString().slice(0, 7);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary', month],
    queryFn: () => fetchSummary(month),
  });

  const maxCategoryTotal = data ? Math.max(1, ...data.byCategory.map((c) => Number(c.total))) : 1;

  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>Summary for {month}</Typography>

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Could not load dashboard summary.</Typography>}

      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Income" value={`R$ ${data.totalIncome}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Expenses" value={`R$ ${data.totalExpense}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Balance" value={`R$ ${data.balance}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Net worth" value={`R$ ${data.netWorth}`} />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>
                  Accounts
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
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>No accounts yet.</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>
                  Spending by category
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
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>No expenses this month.</Typography>
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
