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
      if (!accountId || !file) throw new Error('Selecione uma conta e um arquivo CSV');
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
      <Typography variant="h4">Importações</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Envie um extrato bancário em CSV para adicionar transações
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Conta"
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
            {file ? file.name : 'Escolher arquivo CSV'}
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>

          <TextField
            label="Saldo inicial deste período (opcional)"
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            helperText="Se preenchido, substitui o saldo inicial da conta por este valor antes de importar. Se deixado em branco, o saldo atual da conta é mantido."
          />

          <TextField
            label="Saldo final deste período (opcional)"
            type="number"
            value={endBalance}
            onChange={(e) => setEndBalance(e.target.value)}
            helperText="Apenas para referência. Útil quando este extrato é mais antigo que dados já importados: o app detecta isso automaticamente e não deixa essas transações alterarem seu saldo atual."
          />

          <Button
            variant="contained"
            disabled={!accountId || !file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Importando...' : 'Importar'}
          </Button>

          {mutation.isSuccess && (
            <Alert severity={mutation.data.historical ? 'info' : 'success'}>
              {mutation.data.imported} importada(s), {mutation.data.duplicated} duplicada(s),{' '}
              {mutation.data.needsReview} para revisar.
              {mutation.data.historical && (
                <>
                  {' '}
                  Este extrato é mais antigo que dados já existentes, então essas transações foram
                  registradas mas não afetam o saldo atual da conta.
                </>
              )}
            </Alert>
          )}
          {mutation.isError && (
            <Alert severity="error">Falha na importação. Verifique o arquivo e tente novamente.</Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
