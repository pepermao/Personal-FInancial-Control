import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState } from '../../components/EmptyState';
import { useConfirm } from '../../hooks/useConfirm';
import { useInvalidate } from '../../hooks/useInvalidate';
import { openFinanceApi, qk, readApiError } from '../../api';
import { BankConnectDialog } from './BankConnectDialog';

/** Pluggy item statuses that mean the connection needs the user to re-authorise. */
const NEEDS_ACTION = new Set(['LOGIN_ERROR', 'WAITING_USER_INPUT', 'OUTDATED', 'NOT_FOUND']);

function statusChip(status: string) {
  if (status === 'UPDATED') return { label: 'Conectado', color: 'success' as const };
  if (status === 'UPDATING') return { label: 'Atualizando', color: 'info' as const };
  if (NEEDS_ACTION.has(status)) return { label: 'Reconectar', color: 'error' as const };
  return { label: status, color: 'default' as const };
}

function formatDateTime(value: string | null): string {
  if (!value) return 'nunca';
  return new Date(value).toLocaleString('pt-BR');
}

export function OpenFinanceConnections() {
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reconnect, setReconnect] = useState<{ connectionId: string; itemId: string } | undefined>();

  const status = useQuery({
    queryKey: qk.openFinance.status(),
    queryFn: openFinanceApi.status,
  });
  const connections = useQuery({
    queryKey: qk.openFinance.connections(),
    queryFn: openFinanceApi.list,
  });

  const register = useMutation({
    mutationFn: openFinanceApi.register,
    onSuccess: (connection) => {
      setNotice(`${connection.connectorName} conectado. Sincronize para trazer os dados.`);
      invalidate.openFinance();
    },
    onError: (err: unknown) => setError(readApiError(err, 'Não foi possível salvar a conexão')),
  });

  const sync = useMutation({
    mutationFn: () => openFinanceApi.sync(365),
    onSuccess: (result) => {
      setNotice(
        `${result.totalImported} transação(ões) importada(s) e ${result.investmentsUpserted} investimento(s) atualizado(s).`,
      );
      invalidate.all();
    },
    onError: (err: unknown) => setError(readApiError(err, 'Falha ao sincronizar')),
  });

  const refresh = useMutation({
    mutationFn: openFinanceApi.refresh,
    onSuccess: () => invalidate.openFinance(),
    onError: (err: unknown) => setError(readApiError(err, 'Falha ao atualizar o status')),
  });

  const remove = useMutation({
    mutationFn: openFinanceApi.remove,
    onSuccess: () => {
      setNotice('Conexão removida. As transações já importadas foram mantidas.');
      invalidate.openFinance();
    },
    onError: (err: unknown) => setError(readApiError(err, 'Falha ao remover a conexão')),
  });

  const openConnect = () => {
    setError(null);
    setNotice(null);
    setReconnect(undefined);
    setDialogOpen(true);
  };

  const openReconnect = (connectionId: string, itemId: string) => {
    setError(null);
    setNotice(null);
    setReconnect({ connectionId, itemId });
    setDialogOpen(true);
  };

  const handleRemove = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remover conexão',
      message: `Remover ${name}? As transações e investimentos já importados continuam no Kevin. Para revogar o acesso aos dados, cancele o compartilhamento também no aplicativo do banco.`,
      destructive: true,
    });
    if (ok) remove.mutate(id);
  };

  const items = connections.data ?? [];
  const busy = register.isPending || sync.isPending;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Open Finance</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Bancos conectados via Pluggy. Os dados são atualizados a cada 24 horas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => sync.mutate()}
            disabled={items.length === 0 || busy}
          >
            {sync.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
          <Button variant="contained" onClick={openConnect} disabled={busy}>
            Conectar banco
          </Button>
        </Stack>
      </Stack>

      {status.data && !status.data.configured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Credenciais da Pluggy ausentes. Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no
          arquivo .env da API.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {connections.isLoading ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : items.length === 0 ? (
        <EmptyState
          paper={false}
          icon={<AccountBalanceIcon fontSize="inherit" />}
          title="Nenhum banco conectado"
          description="Conecte sua conta para importar extratos, faturas e investimentos automaticamente."
          action={
            <Button variant="contained" onClick={openConnect}>
              Conectar banco
            </Button>
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {items.map((connection) => {
            const chip = statusChip(connection.status);
            return (
              <Stack
                key={connection.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}
              >
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {connection.connectorName}
                    </Typography>
                    <Chip size="small" label={chip.label} color={chip.color} />
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                    Última sincronização: {formatDateTime(connection.lastSyncAt)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {NEEDS_ACTION.has(connection.status) && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => openReconnect(connection.id, connection.itemId)}
                    >
                      Reconectar
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={() => refresh.mutate(connection.id)}
                    disabled={refresh.isPending}
                  >
                    Verificar
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleRemove(connection.id, connection.connectorName)}
                  >
                    Remover
                  </Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}

      <BankConnectDialog
        open={dialogOpen}
        reconnect={reconnect}
        onClose={() => setDialogOpen(false)}
        onConnected={async (itemId) => {
          await register.mutateAsync(itemId);
        }}
        onError={setError}
      />
    </Paper>
  );
}
