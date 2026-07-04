import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import { apiClient } from '../api/client';
import { AssetType } from '@ledger/shared';
import type { AssetDto } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.CASH]: 'Cash',
  [AssetType.RDB]: 'RDB',
  [AssetType.INVESTMENT]: 'Investment',
  [AssetType.REAL_ESTATE]: 'Real Estate',
  [AssetType.OTHER]: 'Other',
};

const ASSET_TYPE_COLORS: Record<AssetType, { bg: string; color: string }> = {
  [AssetType.CASH]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.RDB]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.INVESTMENT]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.REAL_ESTATE]: { bg: '#F1F3F5', color: '#55636E' },
  [AssetType.OTHER]: { bg: '#F1F3F5', color: '#55636E' },
};

async function fetchAssets() {
  const { data } = await apiClient.get<AssetDto[]>('/assets');
  return data;
}

export function AssetsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  return (
    <Box>
      <Typography variant="h4">Assets</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Everything you own, at a glance
      </Typography>

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Could not load assets.</Typography>}

      {data && (
        <>
          <Grid container spacing={2}>
            {paginate(data).map((asset) => {
              const typeColor = ASSET_TYPE_COLORS[asset.type];
              return (
                <Grid item xs={12} sm={6} md={4} key={asset.id}>
                  <Paper sx={{ p: 2.25, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{asset.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#7A868E', mt: 0.25 }}>
                          {new Date(asset.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </Typography>
                      </Box>
                      <Chip
                        label={ASSET_TYPE_LABELS[asset.type]}
                        size="small"
                        sx={{ bgcolor: typeColor.bg, color: typeColor.color }}
                      />
                    </Stack>
                    <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', mt: 2 }}>
                      R$ {asset.value}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
            {data.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#7A868E' }}>No assets yet.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
          <TablePagination
            component="div"
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24]}
            sx={{ mt: 1 }}
          />
        </>
      )}
    </Box>
  );
}
