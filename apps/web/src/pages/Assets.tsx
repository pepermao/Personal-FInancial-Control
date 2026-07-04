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
import { ASSET_TYPE_LABELS, isRealEstate, sumValue } from '../lib/assetDisplay';

async function fetchAssets() {
  const { data } = await apiClient.get<AssetDto[]>('/assets');
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

export function AssetsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });

  const investments = data?.filter((asset) => !isRealEstate(asset)) ?? [];
  const realEstate = data?.filter(isRealEstate) ?? [];
  const totalInvestments = sumValue(investments);
  const totalRealEstate = sumValue(realEstate);
  const totalAssets = totalInvestments + totalRealEstate;

  const byType = new Map<string, number>();
  for (const asset of investments) {
    byType.set(asset.type, (byType.get(asset.type) ?? 0) + Number(asset.value));
  }
  const allocation = Array.from(byType.entries())
    .map(([type, total]) => ({ type, total, label: ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] }))
    .sort((a, b) => b.total - a.total);
  const maxAllocation = Math.max(1, ...allocation.map((a) => a.total), totalRealEstate);

  return (
    <Box>
      <Typography variant="h4">Ativos</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Tudo o que você possui, ao longo do tempo
      </Typography>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar os ativos.</Typography>}

      {data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <KpiCard label="Investimentos" value={`R$ ${totalInvestments.toFixed(2)}`} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="Imóveis" value={`R$ ${totalRealEstate.toFixed(2)}`} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="Patrimônio total" value={`R$ ${totalAssets.toFixed(2)}`} />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
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
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>R$ {entry.total.toFixed(2)}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(entry.total / maxAllocation) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#F1F3F5',
                          '& .MuiLinearProgress-bar': { backgroundColor: '#0E9D63', borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                  {allocation.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>Nenhum investimento ainda.</Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: 16 }}>
                    Imóveis
                  </Typography>
                  <Button component={RouterLink} to="/real-estate" size="small">
                    Ver todos
                  </Button>
                </Stack>
                <Stack divider={<Box sx={{ borderBottom: '1px solid #F1F3F5' }} />} spacing={1.25}>
                  {realEstate.map((asset) => (
                    <Stack key={asset.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{asset.name}</Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>R$ {asset.value}</Typography>
                    </Stack>
                  ))}
                  {realEstate.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>Nenhum imóvel ainda.</Typography>
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
