import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import { apiClient } from '../api/client';
import type { AssetDto } from '@ledger/shared';
import { ASSET_TYPE_LABELS, sumValue } from '../lib/assetDisplay';
import { formatBRL } from '../utils/format';
import { KpiCard } from '../components/KpiCard';

async function fetchAssets() {
  const { data } = await apiClient.get<AssetDto[]>('/assets');
  return data;
}

export function AssetsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });

  const investments = data ?? [];
  const totalInvestments = sumValue(investments);

  const byType = new Map<string, number>();
  for (const asset of investments) {
    byType.set(asset.type, (byType.get(asset.type) ?? 0) + Number(asset.value));
  }
  const allocation = Array.from(byType.entries())
    .map(([type, total]) => ({ type, total, label: ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] }))
    .sort((a, b) => b.total - a.total);
  const maxAllocation = Math.max(1, ...allocation.map((a) => a.total));

  return (
    <Box>
      <Typography variant="h4">Ativos</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 3 }}>
        Tudo o que você possui, ao longo do tempo
      </Typography>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar os ativos.</Typography>}

      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <KpiCard label="Investimentos" value={formatBRL(totalInvestments)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <KpiCard label="Ativos" value={String(investments.length)} />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: 16 }}>
                    Investimentos
                  </Typography>
                  <Button component={RouterLink} to="/investments" size="small">
                    Ver todos
                  </Button>
                </Stack>
                <Stack spacing={1.5}>
                  {allocation.map((entry) => (
                    <Box key={entry.type}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{entry.label}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatBRL(entry.total)}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(entry.total / maxAllocation) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': { backgroundColor: 'success.main', borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                  {allocation.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Nenhum investimento ainda.</Typography>
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
