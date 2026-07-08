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
import IconButton from '@mui/material/IconButton';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { accountsApi, importsApi, qk } from '../api';
import { parseBRLInput } from '../utils/format';

export function ImportsPage() {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [initialBalance, setInitialBalance] = useState('');
  const [endBalance, setEndBalance] = useState('');

  const { data: accounts } = useQuery({ queryKey: qk.accounts.all(), queryFn: accountsApi.list });

  const mutation = useMutation({
    mutationFn: () => {
      if (!accountId || files.length === 0) throw new Error('Selecione uma conta e pelo menos um arquivo CSV');
      return importsApi.bulk({
        accountId,
        files,
        initialBalance: parseBRLInput(initialBalance),
        endBalance: parseBRLInput(endBalance),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.accounts.all() });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: qk.transactions.all() });
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFilesAdded = (list: FileList | null) => {
    if (!list) return;
    const additions = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const fresh = additions.filter((f) => !seen.has(`${f.name}-${f.size}`));
      return [...prev, ...fresh];
    });
  };

  const totals = mutation.data
    ? mutation.data.results.reduce(
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

      <Paper sx={{ width: '100%', p: 3, textAlign: 'left' }}>
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
            {files.length === 0
              ? 'Escolher arquivos CSV'
              : `${files.length} arquivo(s) selecionado(s) — adicionar mais`}
            <input
              type="file"
              accept=".csv"
              multiple
              hidden
              onChange={(e) => handleFilesAdded(e.target.files)}
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

          {files.length === 1 && (
            <>
              <TextField
                label="Saldo inicial deste período (opcional)"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 11.969,80"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                helperText="Se preenchido, substitui o saldo inicial da conta por este valor antes de importar."
              />
              <TextField
                label="Saldo final deste período (opcional)"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 11.969,80"
                value={endBalance}
                onChange={(e) => setEndBalance(e.target.value)}
                helperText="Aceita formato brasileiro (11.969,80) ou inglês (11969.80)."
              />
            </>
          )}

          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Arquivos processados em ordem alfabética pelo nome. Duplicatas entre extratos são detectadas automaticamente pelo fingerprint.
          </Typography>

          <Button
            variant="contained"
            disabled={!accountId || files.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? `Importando ${files.length} arquivo(s)...`
              : `Importar ${files.length || ''} arquivo(s)`.trim()}
          </Button>

          {mutation.isSuccess && totals && (
            <>
              <Alert severity={totals.failed > 0 ? 'warning' : 'success'}>
                <strong>Total:</strong> {totals.imported} importada(s), {totals.duplicated} duplicada(s),{' '}
                {totals.needsReview} para revisar
                {totals.skipped > 0 && `, ${totals.skipped} linha(s) ignorada(s)`}
                {totals.failed > 0 && `, ${totals.failed} arquivo(s) com erro`}.
              </Alert>
              <Stack
                divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                {mutation.data.results.map((r) => (
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
          {mutation.isError && (
            <Alert severity="error">Falha na importação. Tente novamente.</Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
