import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import { CategoryKind, Direction } from '@ledger/shared';
import type { CategoryDto } from '@ledger/shared';
import { categoriesApi, qk, readApiError, transactionsApi } from '../api';
import { formatBRL } from '../utils/format';
import { useInvalidate } from '../hooks/useInvalidate';
import { useConfirm } from '../hooks/useConfirm';
import { usePeriodState } from '../hooks/usePeriodState';
import { PeriodPicker } from '../components/PeriodPicker';

const KIND_LABEL: Record<CategoryKind, string> = {
  [CategoryKind.INCOME]: 'Receita',
  [CategoryKind.EXPENSE]: 'Despesa',
  [CategoryKind.TRANSFER]: 'Transferência',
  [CategoryKind.INVESTMENT]: 'Investimento',
  [CategoryKind.REIMBURSEMENT]: 'Reembolso',
};

const KIND_HELP: Record<CategoryKind, string> = {
  [CategoryKind.INCOME]: 'Entra no saldo da conta e nas receitas do mês.',
  [CategoryKind.EXPENSE]: 'Sai do saldo da conta e entra nas despesas do mês.',
  [CategoryKind.TRANSFER]: 'Movimentação entre contas suas. Não afeta saldo total nem dashboard.',
  [CategoryKind.INVESTMENT]: 'Envio/resgate de investimento. Não afeta saldo total nem dashboard (dinheiro continua seu).',
  [CategoryKind.REIMBURSEMENT]: 'Estorno/reembolso. Volta pro saldo e reduz o total de despesas do mês.',
};

const KIND_COLOR: Record<CategoryKind, 'success' | 'default' | 'info' | 'warning' | 'secondary'> = {
  [CategoryKind.INCOME]: 'success',
  [CategoryKind.EXPENSE]: 'default',
  [CategoryKind.TRANSFER]: 'info',
  [CategoryKind.INVESTMENT]: 'secondary',
  [CategoryKind.REIMBURSEMENT]: 'warning',
};

interface CategoryFormValues {
  name: string;
  kind: CategoryKind;
  parentId: string | null;
}

export function CategoriesPage() {
  const invalidateAll = useInvalidate();
  const confirm = useConfirm();
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.categories.all(),
    queryFn: categoriesApi.list,
  });
  const { data: transactions } = useQuery({
    queryKey: qk.transactions.all(),
    queryFn: transactionsApi.list,
  });

  const period = usePeriodState(
    { months: (transactions ?? []).map((tx) => tx.competenceMonth) },
    'all',
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [form, setForm] = useState<CategoryFormValues>({
    name: '',
    kind: CategoryKind.EXPENSE,
    parentId: null,
  });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const invalidate = () => {
    invalidateAll.categories();
    invalidateAll.transactions();
    invalidateAll.dashboard();
  };

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      categoriesApi.create({ name: values.name, kind: values.kind, parentId: values.parentId }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (err: unknown) => setMutationError(readApiError(err, 'Erro ao criar')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      categoriesApi.update(id, { name: values.name, kind: values.kind, parentId: values.parentId }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (err: unknown) => setMutationError(readApiError(err, 'Erro ao atualizar')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: invalidate,
    onError: (err: unknown) => setMutationError(readApiError(err, 'Erro ao excluir')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', kind: CategoryKind.EXPENSE, parentId: null });
    setMutationError(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryDto) => {
    setEditing(category);
    setForm({ name: category.name, kind: category.kind, parentId: category.parentId });
    setMutationError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setMutationError(null);
  };

  const submitForm = () => {
    if (!form.name.trim()) {
      setMutationError('Nome é obrigatório');
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, values: form });
    else createMutation.mutate(form);
  };

  const totalsByCategory = new Map<string, number>();
  for (const tx of transactions ?? []) {
    if (tx.direction !== Direction.EXPENSE || !tx.impactsDashboardExpense || !tx.categoryId) continue;
    if (!period.includes(tx.competenceMonth)) continue;
    totalsByCategory.set(tx.categoryId, (totalsByCategory.get(tx.categoryId) ?? 0) + Number(tx.amount));
  }
  const topLevel = data?.filter((category) => !category.parentId) ?? [];
  const categoriesById = new Map((data ?? []).map((c) => [c.id, c]));
  const sortedAll = [...(data ?? [])].sort((a, b) => {
    const pa = a.parentId ? categoriesById.get(a.parentId)?.name ?? '' : a.name;
    const pb = b.parentId ? categoriesById.get(b.parentId)?.name ?? '' : b.name;
    return `${pa} ${a.name}`.localeCompare(`${pb} ${b.name}`, 'pt-BR');
  });
  const parentCandidates = (data ?? []).filter((c) => !c.parentId && (!editing || c.id !== editing.id));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Categorias</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Padrões de gastos por categoria
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          {transactions && (
            <PeriodPicker
              periodType={period.periodType}
              year={period.effectiveYear}
              month={period.effectiveMonth}
              onPeriodTypeChange={period.onPeriodTypeChange}
              onYearChange={period.setYear}
              onMonthChange={period.setMonth}
              minDate={period.minDate}
              maxDate={period.maxDate}
              showAllOption
            />
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nova categoria
          </Button>
        </Stack>
      </Stack>

      {mutationError && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMutationError(null)}>
          {mutationError}
        </Alert>
      )}

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as categorias.</Typography>}

      {data && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {topLevel.map((category) => {
              const total = totalsByCategory.get(category.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Paper sx={{ p: 2.25, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{category.name}</Typography>
                        <Chip
                          size="small"
                          label={KIND_LABEL[category.kind]}
                          color={KIND_COLOR[category.kind]}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Stack>
                    <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', mt: 1.5 }}>
                      {formatBRL(total ?? 0)}
                    </Typography>
                    {!total && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                        Nenhum gasto registrado
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
            {topLevel.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma categoria ainda.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Pai</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAll.map((category) => {
                    const parent = category.parentId ? categoriesById.get(category.parentId) : undefined;
                    return (
                      <TableRow key={category.id} hover>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={KIND_LABEL[category.kind]}
                            color={KIND_COLOR[category.kind]}
                          />
                        </TableCell>
                        <TableCell>{parent?.name ?? '-'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEdit(category)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Excluir categoria',
                                message: `Excluir "${category.name}"? Transações vinculadas ficarão sem categoria.`,
                                confirmLabel: 'Excluir',
                                destructive: true,
                              });
                              if (ok) deleteMutation.mutate(category.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sortedAll.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhuma categoria cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Tipo"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as CategoryKind })}
              helperText={KIND_HELP[form.kind]}
              fullWidth
            >
              {Object.values(CategoryKind).map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {KIND_LABEL[kind]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Categoria pai (opcional)"
              value={form.parentId ?? ''}
              onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
              fullWidth
            >
              <MenuItem value="">— nenhuma —</MenuItem>
              {parentCandidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {mutationError && <Alert severity="error">{mutationError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitForm}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
