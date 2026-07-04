import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import TablePagination from '@mui/material/TablePagination';
import AddIcon from '@mui/icons-material/Add';
import { apiClient } from '../api/client';
import { AssetType, ProfitRateType } from '@ledger/shared';
import type { AssetDto } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';
import { formatBRL } from '../utils/format';
import {
  ASSET_TYPE_LABELS,
  AssetCard,
  INVESTMENT_TYPES,
  PROFIT_RATE_TYPE_LABELS,
  TYPES_WITHOUT_RATE,
  isRealEstate,
  sumValue,
} from '../lib/assetDisplay';

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

function emptyForm(): AssetFormState {
  return {
    name: '',
    type: AssetType.CDB,
    value: '0',
    profitRateType: ProfitRateType.NONE,
    profitRate: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  };
}

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

export function InvestmentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AssetFormState>(emptyForm());

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
    setForm(emptyForm());
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
    if (window.confirm(`Excluir o investimento "${asset.name}"? Essa ação não pode ser desfeita.`)) {
      deleteMutation.mutate(asset.id);
    }
  };

  const showRateFields = !TYPES_WITHOUT_RATE.has(form.type);
  const investments = data?.filter((asset) => !isRealEstate(asset)) ?? [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Investimentos</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            CDB, Tesouro Direto, ações, fundos e outros
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Novo investimento
        </Button>
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar os investimentos.</Typography>}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível excluir o investimento.
        </Alert>
      )}

      {data && (
        <>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mb: 2 }}>
            Total investido: {formatBRL(sumValue(investments))}
          </Typography>

          <Grid container spacing={2}>
            {paginate(investments).map((asset) => (
              <Grid item xs={12} sm={6} md={4} key={asset.id}>
                <AssetCard asset={asset} onEdit={openEditDialog} onDelete={handleDelete} />
              </Grid>
            ))}
            {investments.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#7A868E' }}>Nenhum investimento ainda.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {investments.length > 0 && (
            <TablePagination
              component="div"
              count={investments.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[6, 12, 24]}
              sx={{ mt: 1 }}
            />
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Editar investimento' : 'Novo investimento'}</DialogTitle>
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
              {INVESTMENT_TYPES.map((type) => (
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

            {saveMutation.isError && <Alert severity="error">Não foi possível salvar o investimento.</Alert>}
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
