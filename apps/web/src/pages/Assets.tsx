import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import TablePagination from '@mui/material/TablePagination';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../api/client';
import { AssetType, ProfitRateType } from '@ledger/shared';
import type { AssetDto } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.CDB]: 'CDB',
  [AssetType.LCI]: 'LCI',
  [AssetType.LCA]: 'LCA',
  [AssetType.TESOURO_SELIC]: 'Tesouro Selic',
  [AssetType.TESOURO_IPCA]: 'Tesouro IPCA+',
  [AssetType.TESOURO_PREFIXADO]: 'Tesouro Prefixado',
  [AssetType.POUPANCA]: 'Poupança',
  [AssetType.ACOES]: 'Ações',
  [AssetType.FII]: 'FII',
  [AssetType.REAL_ESTATE]: 'Imóvel',
  [AssetType.OTHER]: 'Outro',
};

const ASSET_TYPE_COLORS: Record<AssetType, { bg: string; color: string }> = {
  [AssetType.CDB]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.LCI]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.LCA]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.TESOURO_SELIC]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.TESOURO_IPCA]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.TESOURO_PREFIXADO]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AssetType.POUPANCA]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.ACOES]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.FII]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.REAL_ESTATE]: { bg: '#F1F3F5', color: '#55636E' },
  [AssetType.OTHER]: { bg: '#F1F3F5', color: '#55636E' },
};

const PROFIT_RATE_TYPE_LABELS: Record<ProfitRateType, string> = {
  [ProfitRateType.PREFIXADO]: 'Prefixado (% a.a.)',
  [ProfitRateType.CDI_PERCENTAGE]: '% do CDI',
  [ProfitRateType.IPCA_PLUS]: 'IPCA+',
  [ProfitRateType.SELIC_PLUS]: 'Selic+',
  [ProfitRateType.POUPANCA]: 'Poupança',
  [ProfitRateType.NONE]: 'Sem rentabilidade',
};

// Real estate and generic "other" don't carry a quoted market rate.
const TYPES_WITHOUT_RATE = new Set<AssetType>([AssetType.REAL_ESTATE, AssetType.OTHER]);

function formatProfitRate(asset: AssetDto): string | null {
  switch (asset.profitRateType) {
    case ProfitRateType.PREFIXADO:
      return asset.profitRate ? `${asset.profitRate}% a.a.` : null;
    case ProfitRateType.CDI_PERCENTAGE:
      return asset.profitRate ? `${asset.profitRate}% do CDI` : null;
    case ProfitRateType.IPCA_PLUS:
      return asset.profitRate ? `IPCA + ${asset.profitRate}% a.a.` : null;
    case ProfitRateType.SELIC_PLUS:
      return asset.profitRate ? `Selic + ${asset.profitRate}% a.a.` : null;
    case ProfitRateType.POUPANCA:
      return 'Poupança';
    default:
      return null;
  }
}

interface AssetFormState {
  id?: string;
  name: string;
  type: AssetType;
  value: string;
  profitRateType: ProfitRateType;
  profitRate: string;
  date: string;
  notes: string;
}

const EMPTY_FORM: AssetFormState = {
  name: '',
  type: AssetType.CDB,
  value: '0',
  profitRateType: ProfitRateType.NONE,
  profitRate: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

async function fetchAssets() {
  const { data } = await apiClient.get<AssetDto[]>('/assets');
  return data;
}

function toPayload(form: AssetFormState) {
  const hasRate = !TYPES_WITHOUT_RATE.has(form.type);
  return {
    name: form.name,
    type: form.type,
    value: form.value || '0',
    profitRateType: hasRate ? form.profitRateType : ProfitRateType.NONE,
    profitRate: hasRate && form.profitRate ? form.profitRate : undefined,
    date: form.date || undefined,
    notes: form.notes || undefined,
  };
}

export function AssetsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AssetFormState>(EMPTY_FORM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: AssetFormState) =>
      values.id
        ? apiClient.patch(`/assets/${values.id}`, toPayload(values))
        : apiClient.post('/assets', toPayload(values)),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/${id}`),
    onSuccess: invalidate,
  });

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (asset: AssetDto) => {
    setForm({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: asset.value,
      profitRateType: asset.profitRateType,
      profitRate: asset.profitRate ?? '',
      date: asset.date.slice(0, 10),
      notes: asset.notes ?? '',
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const handleDelete = (asset: AssetDto) => {
    if (window.confirm(`Excluir o ativo "${asset.name}"? Essa ação não pode ser desfeita.`)) {
      deleteMutation.mutate(asset.id);
    }
  };

  const showRateFields = !TYPES_WITHOUT_RATE.has(form.type);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Ativos</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            Tudo o que você possui, ao longo do tempo
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Novo ativo
        </Button>
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar os ativos.</Typography>}
      {deleteMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Não foi possível excluir o ativo.</Alert>}

      {data && (
        <>
          <Grid container spacing={2}>
            {paginate(data).map((asset) => {
              const typeColor = ASSET_TYPE_COLORS[asset.type];
              const rateLabel = formatProfitRate(asset);
              return (
                <Grid item xs={12} sm={6} md={4} key={asset.id}>
                  <Paper sx={{ p: 2.25, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{asset.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#7A868E', mt: 0.25 }}>
                          {new Date(asset.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
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
                    {rateLabel && (
                      <Typography sx={{ fontSize: 12, color: '#0E9D63', fontWeight: 700, mt: 0.5 }}>
                        {rateLabel}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      <IconButton size="small" onClick={() => openEditDialog(asset)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(asset)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
            {data.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#7A868E' }}>Nenhum ativo ainda.</Typography>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Editar ativo' : 'Novo ativo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as AssetType;
                setForm({
                  ...form,
                  type,
                  ...(TYPES_WITHOUT_RATE.has(type)
                    ? { profitRateType: ProfitRateType.NONE, profitRate: '' }
                    : {}),
                });
              }}
            >
              {Object.values(AssetType).map((type) => (
                <MenuItem key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Valor investido"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required
            />

            {showRateFields && (
              <>
                <TextField
                  select
                  label="Rentabilidade"
                  value={form.profitRateType}
                  onChange={(e) => setForm({ ...form, profitRateType: e.target.value as ProfitRateType })}
                >
                  {Object.values(ProfitRateType).map((rateType) => (
                    <MenuItem key={rateType} value={rateType}>
                      {PROFIT_RATE_TYPE_LABELS[rateType]}
                    </MenuItem>
                  ))}
                </TextField>

                {form.profitRateType !== ProfitRateType.NONE && (
                  <TextField
                    label="Taxa (%)"
                    type="number"
                    value={form.profitRate}
                    onChange={(e) => setForm({ ...form, profitRate: e.target.value })}
                    helperText={
                      form.profitRateType === ProfitRateType.CDI_PERCENTAGE
                        ? 'Ex.: 110 para 110% do CDI'
                        : form.profitRateType === ProfitRateType.IPCA_PLUS
                          ? 'Ex.: 6 para IPCA + 6% a.a.'
                          : form.profitRateType === ProfitRateType.SELIC_PLUS
                            ? 'Ex.: 0.5 para Selic + 0,5% a.a.'
                            : 'Taxa anual em %'
                    }
                  />
                )}
              </>
            )}

            <TextField
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Observações"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              minRows={2}
            />

            {saveMutation.isError && <Alert severity="error">Não foi possível salvar o ativo.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.name || !form.value || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
