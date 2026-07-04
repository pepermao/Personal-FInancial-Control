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
import Alert from '@mui/material/Alert';
import TablePagination from '@mui/material/TablePagination';
import AddIcon from '@mui/icons-material/Add';
import { apiClient } from '../api/client';
import { AssetType, ProfitRateType } from '@ledger/shared';
import type { AssetDto } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';
import { AssetCard, isRealEstate, sumValue } from '../lib/assetDisplay';
import { formatBRL } from '../utils/format';

interface RealEstateFormState {
  id?: string;
  name: string;
  value: string;
  date: string;
  notes: string;
}

function emptyForm(): RealEstateFormState {
  return {
    name: '',
    value: '0',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  };
}

async function fetchAssets() {
  const { data } = await apiClient.get<AssetDto[]>('/assets');
  return data;
}

function toPayload(form: RealEstateFormState) {
  return {
    name: form.name,
    type: AssetType.REAL_ESTATE,
    value: form.value || '0',
    profitRateType: ProfitRateType.NONE,
    date: form.date || undefined,
    notes: form.notes || undefined,
  };
}

export function RealEstatePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RealEstateFormState>(emptyForm());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: RealEstateFormState) =>
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
      value: asset.value,
      date: asset.date.slice(0, 10),
      notes: asset.notes ?? '',
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const handleDelete = (asset: AssetDto) => {
    if (window.confirm(`Excluir o imóvel "${asset.name}"? Essa ação não pode ser desfeita.`)) {
      deleteMutation.mutate(asset.id);
    }
  };

  const realEstate = data?.filter(isRealEstate) ?? [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Imóveis</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            Propriedades e patrimônio imobiliário
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Novo imóvel
        </Button>
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar os imóveis.</Typography>}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível excluir o imóvel.
        </Alert>
      )}

      {data && (
        <>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mb: 2 }}>
            Valor total: {formatBRL(sumValue(realEstate))}
          </Typography>

          <Grid container spacing={2}>
            {paginate(realEstate).map((asset) => (
              <Grid item xs={12} sm={6} md={4} key={asset.id}>
                <AssetCard asset={asset} onEdit={openEditDialog} onDelete={handleDelete} />
              </Grid>
            ))}
            {realEstate.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#7A868E' }}>Nenhum imóvel ainda.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {realEstate.length > 0 && (
            <TablePagination
              component="div"
              count={realEstate.length}
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
        <DialogTitle>{form.id ? 'Editar imóvel' : 'Novo imóvel'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <TextField
              label="Valor"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required
            />

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

            {saveMutation.isError && <Alert severity="error">Não foi possível salvar o imóvel.</Alert>}
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
