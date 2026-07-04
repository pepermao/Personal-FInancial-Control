import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import { apiClient } from '../api/client';
import type { AccountDto, CategoryDto, ReclassifyResultDto, TransactionDto } from '@ledger/shared';
import { CategoryKind, Direction } from '@ledger/shared';
import { formatBRL } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import { PeriodPicker, type PeriodType, monthStringToDate } from '../components/PeriodPicker';

interface TransactionRow extends TransactionDto {
  account?: { name: string; bank?: { name: string } };
  category?: { name: string; kind: CategoryKind } | null;
}

const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.INCOME]: 'Receita',
  [Direction.EXPENSE]: 'Despesa',
};

const KIND_LABEL: Record<CategoryKind, string> = {
  [CategoryKind.INCOME]: 'Receita',
  [CategoryKind.EXPENSE]: 'Despesa',
  [CategoryKind.TRANSFER]: 'Transferência',
  [CategoryKind.INVESTMENT]: 'Investimento',
  [CategoryKind.REIMBURSEMENT]: 'Reembolso',
};

async function fetchTransactions() {
  const { data } = await apiClient.get<TransactionRow[]>('/transactions');
  return data;
}
async function fetchCategories() {
  const { data } = await apiClient.get<CategoryDto[]>('/categories');
  return data;
}
async function fetchAccounts() {
  const { data } = await apiClient.get<AccountDto[]>('/accounts');
  return data;
}

interface TransactionFormValues {
  accountId: string;
  date: string;
  descriptionRaw: string;
  amount: string;
  direction: Direction;
  categoryId: string | null;
  notes: string;
}

function emptyForm(defaultAccount?: string): TransactionFormValues {
  return {
    accountId: defaultAccount ?? '',
    date: new Date().toISOString().slice(0, 10),
    descriptionRaw: '',
    amount: '',
    direction: Direction.EXPENSE,
    categoryId: null,
    notes: '',
  };
}

async function createTx(values: TransactionFormValues) {
  const date = new Date(values.date);
  const competenceMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const { data } = await apiClient.post<TransactionDto>('/transactions', {
    accountId: values.accountId,
    date: date.toISOString(),
    competenceMonth,
    descriptionRaw: values.descriptionRaw,
    amount: values.amount,
    direction: values.direction,
    categoryId: values.categoryId ?? undefined,
    notes: values.notes || undefined,
  });
  return data;
}

async function updateTx({ id, values }: { id: string; values: TransactionFormValues }) {
  const date = new Date(values.date);
  const competenceMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const { data } = await apiClient.patch<TransactionDto>(`/transactions/${id}`, {
    accountId: values.accountId,
    date: date.toISOString(),
    competenceMonth,
    descriptionRaw: values.descriptionRaw,
    amount: values.amount,
    direction: values.direction,
    categoryId: values.categoryId,
    notes: values.notes || undefined,
  });
  return data;
}

async function deleteTx(id: string) {
  await apiClient.delete(`/transactions/${id}`);
}

async function patchCategory(id: string, categoryId: string | null) {
  const { data } = await apiClient.patch<TransactionDto>(`/transactions/${id}`, { categoryId });
  return data;
}

async function reclassifyTransactions() {
  const { data } = await apiClient.post<ReclassifyResultDto>('/transactions/reclassify');
  return data;
}

interface CategoryOption {
  id: string;
  label: string;
  kind: CategoryKind;
}

function buildCategoryOptions(categories: CategoryDto[]): CategoryOption[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories
    .map((c) => {
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      return { id: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name, kind: c.kind };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });
  const categoryOptions = useMemo(() => (categories ? buildCategoryOptions(categories) : []), [categories]);
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination(50);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterKind, setFilterKind] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [year, setYear] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRow | null>(null);
  const [form, setForm] = useState<TransactionFormValues>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-net-worth-history'] });
  };

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string | null }) => patchCategory(id, categoryId),
    onSuccess: () => invalidate(),
    onSettled: () => setEditingCategoryId(null),
  });

  const bulkCategoryMutation = useMutation({
    mutationFn: async ({ ids, categoryId }: { ids: string[]; categoryId: string | null }) => {
      await Promise.all(ids.map((id) => patchCategory(id, categoryId)));
    },
    onSuccess: () => {
      invalidate();
      setSelectedIds(new Set());
    },
  });

  const createMutation = useMutation({
    mutationFn: createTx,
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Erro ao criar transação'),
  });

  const editMutation = useMutation({
    mutationFn: updateTx,
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Erro ao atualizar transação'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTx,
    onSuccess: () => invalidate(),
  });

  const reclassifyMutation = useMutation({
    mutationFn: reclassifyTransactions,
    onSuccess: () => invalidate(),
  });

  const months = (data ?? []).map((tx) => tx.competenceMonth);
  const earliestMonth = months.length ? months.reduce((a, b) => (a < b ? a : b)) : undefined;
  const latestMonth = months.length ? months.reduce((a, b) => (a > b ? a : b)) : undefined;
  const defaultYear = latestMonth?.slice(0, 4) ?? String(new Date().getFullYear());
  const effectiveYear = year ?? defaultYear;
  const effectiveMonth = month ?? latestMonth ?? `${effectiveYear}-01`;
  const minDate = earliestMonth ? monthStringToDate(earliestMonth) : undefined;
  const maxDate = new Date();

  const handlePeriodTypeChange = (value: PeriodType) => {
    if (value === periodType) return;
    if (value === 'month' && !month) setMonth(latestMonth ?? `${effectiveYear}-01`);
    if (value === 'year' && !year) setYear(defaultYear);
    setPeriodType(value);
  };

  const searchNormalized = search.trim().toUpperCase();
  const filtered = (data ?? []).filter((tx) => {
    if (periodType === 'year' && !tx.competenceMonth.startsWith(effectiveYear)) return false;
    if (periodType === 'month' && tx.competenceMonth !== effectiveMonth) return false;
    if (filterAccount && tx.accountId !== filterAccount) return false;
    if (filterCategory) {
      if (filterCategory === '__none__') {
        if (tx.categoryId) return false;
      } else if (tx.categoryId !== filterCategory) return false;
    }
    if (filterKind) {
      if (filterKind === '__none__') {
        if (tx.category) return false;
      } else if (tx.category?.kind !== filterKind) return false;
    }
    if (filterDirection && tx.direction !== filterDirection) return false;
    if (searchNormalized && !tx.descriptionNormalized.includes(searchNormalized)) return false;
    return true;
  });

  const rows = paginate(filtered);
  const allVisibleSelected = rows.length > 0 && rows.every((tx) => selectedIds.has(tx.id));
  const someVisibleSelected = rows.some((tx) => selectedIds.has(tx.id));

  const toggleAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) rows.forEach((tx) => next.delete(tx.id));
    else rows.forEach((tx) => next.add(tx.id));
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const openCreate = () => {
    setEditingTx(null);
    setForm(emptyForm(accounts?.[0]?.id));
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (tx: TransactionRow) => {
    setEditingTx(tx);
    setForm({
      accountId: tx.accountId,
      date: tx.date.slice(0, 10),
      descriptionRaw: tx.descriptionRaw,
      amount: String(tx.amount),
      direction: tx.direction,
      categoryId: tx.categoryId,
      notes: tx.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTx(null);
    setFormError(null);
  };

  const submitForm = () => {
    if (!form.accountId) return setFormError('Selecione uma conta');
    if (!form.descriptionRaw.trim()) return setFormError('Descrição obrigatória');
    if (!form.amount || Number.isNaN(Number(form.amount))) return setFormError('Valor inválido');
    if (editingTx) editMutation.mutate({ id: editingTx.id, values: form });
    else createMutation.mutate(form);
  };

  const clearFilters = () => {
    setFilterAccount('');
    setFilterCategory('');
    setFilterKind('');
    setFilterDirection('');
    setSearch('');
  };

  const anyFilterActive = filterAccount || filterCategory || filterKind || filterDirection || search;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Transações</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {data ? `${filtered.length} registro${filtered.length === 1 ? '' : 's'}` : ' '}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          {data && (
            <PeriodPicker
              periodType={periodType}
              year={effectiveYear}
              month={effectiveMonth}
              onPeriodTypeChange={handlePeriodTypeChange}
              onYearChange={setYear}
              onMonthChange={setMonth}
              minDate={minDate}
              maxDate={maxDate}
              showAllOption
            />
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            disabled={reclassifyMutation.isPending}
            onClick={() => reclassifyMutation.mutate()}
          >
            {reclassifyMutation.isPending ? 'Reclassificando...' : 'Reclassificar'}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nova transação
          </Button>
        </Stack>
      </Stack>

      {reclassifyMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {reclassifyMutation.data.scanned} transação(ões) verificada(s), {reclassifyMutation.data.updated}{' '}
          atualizada(s).
        </Alert>
      )}
      {(reclassifyMutation.isError || deleteMutation.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Ocorreu um erro. Tente novamente.
        </Alert>
      )}

      {data && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
            <TextField
              size="small"
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              select
              size="small"
              label="Conta"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {(accounts ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Categoria"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="__none__">Sem categoria</MenuItem>
              {categoryOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Tipo"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="__none__">Sem categoria</MenuItem>
              {Object.values(CategoryKind).map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {KIND_LABEL[kind]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Direção"
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value={Direction.INCOME}>Receita</MenuItem>
              <MenuItem value={Direction.EXPENSE}>Despesa</MenuItem>
            </TextField>
            {anyFilterActive && (
              <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {selectedIds.size > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'action.selected',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
            {selectedIds.size} selecionada(s)
          </Typography>
          <Autocomplete
            size="small"
            options={categoryOptions}
            value={null}
            onChange={(_, option) => {
              if (!option) return;
              bulkCategoryMutation.mutate({ ids: Array.from(selectedIds), categoryId: option.id });
            }}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            disabled={bulkCategoryMutation.isPending}
            sx={{ minWidth: 260 }}
            renderInput={(params) => <TextField {...params} label="Aplicar categoria" />}
          />
          <Button
            size="small"
            onClick={() =>
              bulkCategoryMutation.mutate({ ids: Array.from(selectedIds), categoryId: null })
            }
            disabled={bulkCategoryMutation.isPending}
          >
            Remover categoria
          </Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>
            Cancelar
          </Button>
        </Paper>
      )}

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as transações.</Typography>}

      {data && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Conta</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Direção</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id} hover selected={selectedIds.has(tx.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleOne(tx.id)}
                      />
                    </TableCell>
                    <TableCell>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                    <TableCell>{tx.descriptionRaw}</TableCell>
                    <TableCell>{tx.account?.name ?? '-'}</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {editingCategoryId === tx.id ? (
                        <Autocomplete
                          size="small"
                          open
                          autoFocus
                          openOnFocus
                          options={categoryOptions}
                          value={categoryOptions.find((o) => o.id === tx.categoryId) ?? null}
                          onChange={(_, option) =>
                            updateCategoryMutation.mutate({ id: tx.id, categoryId: option?.id ?? null })
                          }
                          onBlur={() => setEditingCategoryId(null)}
                          getOptionLabel={(option) => option.label}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                          disabled={updateCategoryMutation.isPending}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              autoFocus
                              placeholder="Buscar categoria..."
                              variant="standard"
                            />
                          )}
                          sx={{ '.MuiInput-root': { fontSize: 13 } }}
                        />
                      ) : (
                        <Box
                          onClick={() => setEditingCategoryId(tx.id)}
                          sx={{
                            cursor: 'pointer',
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            color: tx.category?.name ? 'inherit' : 'text.secondary',
                            '&:hover': { backgroundColor: 'action.hover' },
                          }}
                        >
                          {tx.category?.name ?? 'Sem categoria'}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatBRL(tx.amount)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={DIRECTION_LABELS[tx.direction]}
                        color={tx.direction === Direction.INCOME ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(tx)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (confirm('Excluir esta transação?')) deleteMutation.mutate(tx.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Nenhuma transação neste período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingTx ? 'Editar transação' : 'Nova transação'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Conta"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              fullWidth
            >
              {(accounts ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Descrição"
              value={form.descriptionRaw}
              onChange={(e) => setForm({ ...form, descriptionRaw: e.target.value })}
              fullWidth
              autoFocus
            />
            <TextField
              label="Valor"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Direção"
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as Direction })}
              fullWidth
            >
              <MenuItem value={Direction.INCOME}>Receita</MenuItem>
              <MenuItem value={Direction.EXPENSE}>Despesa</MenuItem>
            </TextField>
            <Autocomplete
              options={categoryOptions}
              value={categoryOptions.find((o) => o.id === form.categoryId) ?? null}
              onChange={(_, option) => setForm({ ...form, categoryId: option?.id ?? null })}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => <TextField {...params} label="Categoria (opcional)" />}
            />
            <TextField
              label="Notas (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitForm}
            disabled={createMutation.isPending || editMutation.isPending}
          >
            {editingTx ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
