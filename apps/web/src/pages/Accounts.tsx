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
import { AccountType } from '@ledger/shared';
import type { AccountDto, BankDto } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.CHECKING]: 'Checking',
  [AccountType.SAVINGS]: 'Savings',
  [AccountType.CREDIT_CARD]: 'Credit Card',
  [AccountType.INVESTMENT]: 'Investment',
  [AccountType.OTHER]: 'Other',
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; color: string }> = {
  [AccountType.CHECKING]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AccountType.SAVINGS]: { bg: '#EAF7F1', color: '#0E9D63' },
  [AccountType.INVESTMENT]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AccountType.CREDIT_CARD]: { bg: '#F1F3F5', color: '#55636E' },
  [AccountType.OTHER]: { bg: '#F1F3F5', color: '#55636E' },
};

interface AccountFormState {
  id?: string;
  bankId: string;
  name: string;
  type: AccountType;
  accountNumber: string;
  initialBalance: string;
  notes: string;
}

const EMPTY_FORM: AccountFormState = {
  bankId: '',
  name: '',
  type: AccountType.CHECKING,
  accountNumber: '',
  initialBalance: '0',
  notes: '',
};

async function fetchAccounts() {
  const { data } = await apiClient.get<AccountDto[]>('/accounts');
  return data;
}

async function fetchBanks() {
  const { data } = await apiClient.get<BankDto[]>('/banks');
  return data;
}

function toPayload(form: AccountFormState) {
  return {
    bankId: form.bankId,
    name: form.name,
    type: form.type,
    accountNumber: form.accountNumber || undefined,
    initialBalance: form.initialBalance || '0',
    notes: form.notes || undefined,
  };
}

export function AccountsPage() {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });
  const { data: banks } = useQuery({ queryKey: ['banks'], queryFn: fetchBanks });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: AccountFormState) =>
      values.id
        ? apiClient.patch(`/accounts/${values.id}`, toPayload(values))
        : apiClient.post('/accounts', toPayload(values)),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/accounts/${id}`),
    onSuccess: invalidate,
  });

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (account: AccountDto) => {
    setForm({
      id: account.id,
      bankId: account.bankId,
      name: account.name,
      type: account.type,
      accountNumber: account.accountNumber ?? '',
      initialBalance: account.initialBalance,
      notes: account.notes ?? '',
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const handleDelete = (account: AccountDto) => {
    if (window.confirm(`Delete account "${account.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(account.id);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Accounts</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>Balances across all your accounts</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          New Account
        </Button>
      </Stack>

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Could not load accounts.</Typography>}
      {deleteMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Could not delete account.</Alert>}

      {accounts && (
        <>
          <Grid container spacing={2}>
            {paginate(accounts).map((account) => {
              const negative = Number(account.currentBalance) < 0;
              const typeColor = ACCOUNT_TYPE_COLORS[account.type];
              return (
                <Grid item xs={12} sm={6} md={4} key={account.id}>
                  <Paper sx={{ p: 2.25, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{account.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#7A868E', mt: 0.25 }}>
                          {account.bank?.name ?? '-'}
                          {account.accountNumber ? ` · ••${account.accountNumber}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={ACCOUNT_TYPE_LABELS[account.type]}
                        size="small"
                        sx={{ bgcolor: typeColor.bg, color: typeColor.color }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        mt: 2,
                        color: negative ? 'error.main' : 'text.primary',
                      }}
                    >
                      R$ {account.currentBalance}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      <IconButton size="small" onClick={() => openEditDialog(account)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(account)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
            {accounts.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: '#7A868E' }}>No accounts yet.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
          <TablePagination
            component="div"
            count={accounts.length}
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
        <DialogTitle>{form.id ? 'Edit account' : 'New account'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Bank"
              value={form.bankId}
              onChange={(e) => setForm({ ...form, bankId: e.target.value })}
              required
            >
              {(banks ?? []).map((bank) => (
                <MenuItem key={bank.id} value={bank.id}>
                  {bank.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
            >
              {Object.values(AccountType).map((type) => (
                <MenuItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Account number"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            />

            <TextField
              label="Initial balance"
              type="number"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              helperText="Starting balance; the account's current balance is this plus its transactions."
            />

            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              minRows={2}
            />

            {saveMutation.isError && <Alert severity="error">Could not save account.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.bankId || !form.name || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
