import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { apiClient } from '../api/client';
import type { ImportSummaryDto } from '@ledger/shared';

interface AccountOption {
  id: string;
  name: string;
}

async function fetchAccounts() {
  const { data } = await apiClient.get<AccountOption[]>('/accounts');
  return data;
}

async function uploadCsv(
  accountId: string,
  file: File,
  initialBalance: string,
  endBalance: string,
) {
  const form = new FormData();
  form.append('accountId', accountId);
  form.append('file', file);
  if (initialBalance.trim() !== '') form.append('initialBalance', initialBalance);
  if (endBalance.trim() !== '') form.append('endBalance', endBalance);
  const { data } = await apiClient.post<ImportSummaryDto>('/imports/csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [initialBalance, setInitialBalance] = useState('');
  const [endBalance, setEndBalance] = useState('');

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });

  const mutation = useMutation({
    mutationFn: () => {
      if (!accountId || !file) throw new Error('Select an account and a CSV file');
      return uploadCsv(accountId, file, initialBalance, endBalance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return (
    <Box>
      <Typography variant="h4">Imports</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Upload a bank statement CSV to add transactions
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {(accounts ?? []).map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>

          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {file ? file.name : 'Choose CSV file'}
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>

          <TextField
            label="Opening balance for this period (optional)"
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            helperText="If set, replaces the account's initial balance with this value before importing. If left blank, the account's current balance is kept as-is."
          />

          <TextField
            label="Closing balance for this period (optional)"
            type="number"
            value={endBalance}
            onChange={(e) => setEndBalance(e.target.value)}
            helperText="For reference only. Useful when this statement is older than data you've already imported: the app detects that automatically and won't let these transactions change your current balance."
          />

          <Button
            variant="contained"
            disabled={!accountId || !file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Importing...' : 'Import'}
          </Button>

          {mutation.isSuccess && (
            <Alert severity={mutation.data.historical ? 'info' : 'success'}>
              Imported {mutation.data.imported}, duplicated {mutation.data.duplicated}, needs
              review {mutation.data.needsReview}.
              {mutation.data.historical && (
                <>
                  {' '}
                  This statement is older than data already on file, so these transactions were
                  recorded but do not affect the account's current balance.
                </>
              )}
            </Alert>
          )}
          {mutation.isError && <Alert severity="error">Import failed. Check the file and try again.</Alert>}
        </Stack>
      </Paper>
    </Box>
  );
}
