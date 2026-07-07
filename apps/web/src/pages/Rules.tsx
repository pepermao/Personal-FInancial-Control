import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
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
import { usePagination } from '../hooks/usePagination';
import type { CategoryDto } from '@ledger/shared';

interface RuleRow {
  id: string;
  pattern: string;
  subcategory?: string | null;
  priority: number;
  active: boolean;
  categoryId: string;
  category?: { name: string };
}

interface RuleFormState {
  id?: string;
  pattern: string;
  categoryId: string;
  subcategory: string;
  priority: string;
  active: boolean;
}

function emptyForm(): RuleFormState {
  return { pattern: '', categoryId: '', subcategory: '', priority: '100', active: true };
}

function toPayload(form: RuleFormState) {
  return {
    pattern: form.pattern,
    categoryId: form.categoryId,
    subcategory: form.subcategory || undefined,
    priority: form.priority ? Number(form.priority) : 100,
    active: form.active,
  };
}

async function fetchRules() {
  const { data } = await apiClient.get<RuleRow[]>('/classification-rules');
  return data;
}

async function fetchCategories() {
  const { data } = await apiClient.get<CategoryDto[]>('/categories');
  return data;
}

function categoryLabel(category: CategoryDto, categoriesById: Map<string, CategoryDto>) {
  const parent = category.parentId ? categoriesById.get(category.parentId) : undefined;
  return parent ? `${parent.name} > ${category.name}` : category.name;
}

const labelSx = { fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'text.secondary', textTransform: 'uppercase' as const };
const pillSx = { bgcolor: 'action.selected', color: 'text.primary', fontWeight: 700 };
const valuePillSx = { bgcolor: '#EAF7F1', color: 'success.main', fontWeight: 700 };

export function RulesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['rules'], queryFn: fetchRules });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>(emptyForm());

  const categoriesById = new Map((categories ?? []).map((category) => [category.id, category]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rules'] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch(`/classification-rules/${id}`, { active }),
    onSuccess: invalidate,
  });

  const saveMutation = useMutation({
    mutationFn: (values: RuleFormState) =>
      values.id
        ? apiClient.patch(`/classification-rules/${values.id}`, toPayload(values))
        : apiClient.post('/classification-rules', toPayload(values)),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classification-rules/${id}`),
    onSuccess: invalidate,
  });

  const openCreateDialog = () => {
    setForm(emptyForm());
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (rule: RuleRow) => {
    setForm({
      id: rule.id,
      pattern: rule.pattern,
      categoryId: rule.categoryId,
      subcategory: rule.subcategory ?? '',
      priority: String(rule.priority),
      active: rule.active,
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const handleDelete = (rule: RuleRow) => {
    if (window.confirm(`Excluir a regra para "${rule.pattern}"? Essa ação não pode ser desfeita.`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Regras de classificação</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Automatize como as transações são organizadas
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nova regra
        </Button>
      </Stack>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as regras.</Typography>}
      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível excluir a regra.
        </Alert>
      )}

      {data && (
        <>
          <Stack spacing={1.25}>
            {paginate(data).map((rule) => (
              <Paper key={rule.id} sx={{ p: 2, opacity: rule.active ? 1 : 0.55 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Typography sx={labelSx}>Se</Typography>
                    <Chip label="Descrição" size="small" sx={pillSx} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>contém</Typography>
                    <Chip label={rule.pattern} size="small" sx={valuePillSx} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>→</Typography>
                    <Typography sx={labelSx}>Então</Typography>
                    <Chip label="Categoria" size="small" sx={pillSx} />
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>=</Typography>
                    <Chip
                      label={rule.subcategory ? `${rule.category?.name ?? '-'} / ${rule.subcategory}` : rule.category?.name ?? '-'}
                      size="small"
                      sx={valuePillSx}
                    />
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEditDialog(rule)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(rule)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Switch
                      checked={rule.active}
                      onChange={(e) => toggleMutation.mutate({ id: rule.id, active: e.target.checked })}
                    />
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {data.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: 'text.secondary' }}>Nenhuma regra ainda.</Typography>
              </Paper>
            )}
          </Stack>
          <TablePagination
            component="div"
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ mt: 1 }}
          />
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Editar regra' : 'Nova regra'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Padrão (contém)"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              helperText="Trecho do texto da descrição que aciona a regra, ex.: Uber"
              required
            />

            <TextField
              select
              label="Categoria"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              {(categories ?? []).map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {categoryLabel(category, categoriesById)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Subcategoria (opcional)"
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              helperText="Rótulo livre, ex.: Uber, ChatGPT, Apartamento"
            />

            <TextField
              label="Prioridade"
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              helperText="Regras com prioridade menor são aplicadas primeiro"
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 14 }}>Regra ativa</Typography>
              <Switch
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            </Stack>

            {saveMutation.isError && <Alert severity="error">Não foi possível salvar a regra.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.pattern || !form.categoryId || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
