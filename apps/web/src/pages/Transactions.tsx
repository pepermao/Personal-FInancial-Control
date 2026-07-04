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
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiClient } from '../api/client';
import type { ReclassifyResultDto, TransactionDto } from '@ledger/shared';
import { Direction } from '@ledger/shared';
import { usePagination } from '../hooks/usePagination';

interface TransactionRow extends TransactionDto {
  account?: { name: string; bank?: { name: string } };
  category?: { name: string } | null;
}

const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.INCOME]: 'Receita',
  [Direction.EXPENSE]: 'Despesa',
};

async function fetchTransactions() {
  const { data } = await apiClient.get<TransactionRow[]>('/transactions');
  return data;
}

async function reclassifyTransactions() {
  const { data } = await apiClient.post<ReclassifyResultDto>('/transactions/reclassify');
  return data;
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const reclassifyMutation = useMutation({
    mutationFn: reclassifyTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const rows = data ? paginate(data) : [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Transações</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            {data ? `${data.length} registro${data.length === 1 ? '' : 's'}` : ' '}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          disabled={reclassifyMutation.isPending}
          onClick={() => reclassifyMutation.mutate()}
        >
          {reclassifyMutation.isPending ? 'Reclassificando...' : 'Reclassificar categorias'}
        </Button>
      </Stack>

      {reclassifyMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {reclassifyMutation.data.scanned} transação(ões) verificada(s), {reclassifyMutation.data.updated}{' '}
          atualizada(s) conforme as regras de classificação atuais.
        </Alert>
      )}
      {reclassifyMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível reclassificar as transações.
        </Alert>
      )}

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as transações.</Typography>}

      {data && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Conta</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Direção</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                    <TableCell>{tx.descriptionRaw}</TableCell>
                    <TableCell>{tx.account?.name ?? '-'}</TableCell>
                    <TableCell>{tx.category?.name ?? '-'}</TableCell>
                    <TableCell align="right">R$ {tx.amount}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={DIRECTION_LABELS[tx.direction]}
                        color={tx.direction === Direction.INCOME ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nenhuma transação ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Paper>
      )}
    </Box>
  );
}
