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
          <Typography variant="h4">Transactions</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5 }}>
            {data ? `${data.length} record${data.length === 1 ? '' : 's'}` : ' '}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          disabled={reclassifyMutation.isPending}
          onClick={() => reclassifyMutation.mutate()}
        >
          {reclassifyMutation.isPending ? 'Reclassifying...' : 'Reclassify categories'}
        </Button>
      </Stack>

      {reclassifyMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Scanned {reclassifyMutation.data.scanned} transaction(s), updated{' '}
          {reclassifyMutation.data.updated} to match current classification rules.
        </Alert>
      )}
      {reclassifyMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not reclassify transactions.
        </Alert>
      )}

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Could not load transactions.</Typography>}

      {data && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Direction</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>{new Date(tx.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</TableCell>
                    <TableCell>{tx.descriptionRaw}</TableCell>
                    <TableCell>{tx.account?.name ?? '-'}</TableCell>
                    <TableCell>{tx.category?.name ?? '-'}</TableCell>
                    <TableCell align="right">R$ {tx.amount}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={tx.direction}
                        color={tx.direction === Direction.INCOME ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No transactions yet.
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
