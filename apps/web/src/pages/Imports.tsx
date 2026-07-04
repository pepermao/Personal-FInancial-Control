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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { apiClient } from '../api/client';
import type { BulkImportResultDto, ImportSummaryDto } from '@ledger/shared';

interface AccountOption {
  id: string;
  name: string;
}

async function fetchAccounts() {
  const { data } = await apiClient.get<AccountOption[]>('/accounts');
  return data;
}

async function uploadCsv(accountId: string, file: File, initialBalance: string, endBalance: string) {
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

async function uploadCsvBulk(accountId: string, files: File[]) {
  const form = new FormData();
  form.append('accountId', accountId);
  files.forEach((f) => form.append('files', f));
  const { data } = await apiClient.post<BulkImportResultDto>('/imports/csv/bulk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [initialBalance, setInitialBalance] = useState('');
  const [endBalance, setEndBalance] = useState('');

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const singleMutation = useMutation({
    mutationFn: () => {
      if (!accountId || !file) throw new Error('Selecione uma conta e um arquivo CSV');
      return uploadCsv(accountId, file, initialBalance, endBalance);
    },
    onSuccess: invalidate,
  });

  const bulkMutation = useMutation({
    mutationFn: () => {
      if (!accountId || files.length === 0) throw new Error('Selecione uma conta e pelo menos um arquivo CSV');
      return uploadCsvBulk(accountId, files);
    },
    onSuccess: invalidate,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkFilesAdded = (list: FileList | null) => {
    if (!list) return;
    const additions = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const fresh = additions.filter((f) => !seen.has(`${f.name}-${f.size}`));
      return [...prev, ...fresh];
    });
  };

  const bulkTotals = bulkMutation.data
    ? bulkMutation.data.results.reduce(
        (acc, r) => ({
          imported: acc.imported + (r.imported ?? 0),
          duplicated: acc.duplicated + (r.duplicated ?? 0),
          needsReview: acc.needsReview + (r.needsReview ?? 0),
          skipped: acc.skipped + (r.skipped ?? 0),
          failed: acc.failed + (r.ok ? 0 : 1),
        }),
        { imported: 0, duplicated: 0, needsReview: 0, skipped: 0, failed: 0 },
      )
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 600,
        mx: 'auto',
        mt: { xs: 4, md: 6 },
      }}
    >
      <Typography variant="h4">Importações</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 3 }}>
        Envie um ou mais extratos bancários em CSV para adicionar transações
      </Typography>

      <Paper sx={{ width: '100%', textAlign: 'left' }}>
        <Tabs
          value={mode}
          onChange={(_, v) => setMode(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="single" label="Um arquivo" />
          <Tab value="bulk" label="Vários arquivos" />
        </Tabs>

        <Box sx={{ p: 3 }}>
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

            {mode === 'single' ? (
              <>
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
                  helperText="Se preenchido, substitui o saldo inicial da conta por este valor antes de importar."
                />

                <TextField
                  label="Saldo final deste período (opcional)"
                  type="number"
                  value={endBalance}
                  onChange={(e) => setEndBalance(e.target.value)}
                  helperText="Apenas para referência. O app detecta extratos históricos automaticamente."
                />

                <Button
                  variant="contained"
                  disabled={!accountId || !file || singleMutation.isPending}
                  onClick={() => singleMutation.mutate()}
                >
                  {singleMutation.isPending ? 'Importando...' : 'Importar'}
                </Button>

                {singleMutation.isSuccess && (
                  <Alert
                    severity={
                      singleMutation.data.imported === 0 &&
                      singleMutation.data.duplicated === 0 &&
                      singleMutation.data.skipped > 0
                        ? 'warning'
                        : singleMutation.data.historical
                          ? 'info'
                          : 'success'
                    }
                  >
                    {singleMutation.data.imported} importada(s), {singleMutation.data.duplicated} duplicada(s),{' '}
                    {singleMutation.data.needsReview} para revisar.
                    {singleMutation.data.skipped > 0 && (
                      <> {singleMutation.data.skipped} linha(s) ignorada(s).</>
                    )}
                    {singleMutation.data.historical && (
                      <> Extrato histórico: não afeta saldo atual.</>
                    )}
                  </Alert>
                )}
                {singleMutation.isError && (
                  <Alert severity="error">
                    Falha na importação. Verifique o arquivo e tente novamente.
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                  {files.length === 0
                    ? 'Escolher arquivos CSV'
                    : `${files.length} arquivo(s) selecionado(s) — adicionar mais`}
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    hidden
                    onChange={(e) => handleBulkFilesAdded(e.target.files)}
                  />
                </Button>

                {files.length > 0 && (
                  <Stack
                    divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
                  >
                    {files.map((f, i) => (
                      <Stack
                        key={`${f.name}-${f.size}-${i}`}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ py: 0.5, px: 1 }}
                      >
                        <Typography sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </Typography>
                        <IconButton size="small" onClick={() => removeFile(i)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Arquivos processados em ordem alfabética pelo nome. Duplicatas entre extratos são detectadas automaticamente pelo fingerprint.
                </Typography>

                <Button
                  variant="contained"
                  disabled={!accountId || files.length === 0 || bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate()}
                >
                  {bulkMutation.isPending
                    ? `Importando ${files.length} arquivo(s)...`
                    : `Importar ${files.length || ''} arquivo(s)`.trim()}
                </Button>

                {bulkMutation.isSuccess && bulkTotals && (
                  <>
                    <Alert severity={bulkTotals.failed > 0 ? 'warning' : 'success'}>
                      <strong>Total:</strong> {bulkTotals.imported} importada(s), {bulkTotals.duplicated} duplicada(s),{' '}
                      {bulkTotals.needsReview} para revisar
                      {bulkTotals.skipped > 0 && `, ${bulkTotals.skipped} linha(s) ignorada(s)`}
                      {bulkTotals.failed > 0 && `, ${bulkTotals.failed} arquivo(s) com erro`}.
                    </Alert>
                    <Stack
                      divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      {bulkMutation.data.results.map((r) => (
                        <Stack
                          key={r.filename}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ py: 1, px: 1.5 }}
                        >
                          {r.ok ? (
                            <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          ) : (
                            <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.filename}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {r.ok
                                ? `${r.imported} importada(s), ${r.duplicated} duplicada(s), ${r.needsReview} revisar${r.skipped ? `, ${r.skipped} ignorada(s)` : ''}${r.historical ? ' (histórico)' : ''}`
                                : r.error}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
                {bulkMutation.isError && (
                  <Alert severity="error">Falha na importação. Tente novamente.</Alert>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
