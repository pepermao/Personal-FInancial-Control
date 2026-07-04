import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import TablePagination from '@mui/material/TablePagination';
import { apiClient } from '../api/client';
import { usePagination } from '../hooks/usePagination';

interface RuleRow {
  id: string;
  pattern: string;
  subcategory?: string | null;
  priority: number;
  active: boolean;
  category?: { name: string };
}

async function fetchRules() {
  const { data } = await apiClient.get<RuleRow[]>('/classification-rules');
  return data;
}

const labelSx = { fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#98A2A9', textTransform: 'uppercase' as const };
const pillSx = { bgcolor: '#F1F3F5', color: '#16202A', fontWeight: 700 };
const valuePillSx = { bgcolor: '#EAF7F1', color: '#0E9D63', fontWeight: 700 };

export function RulesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['rules'], queryFn: fetchRules });
  const { page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage } = usePagination();

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch(`/classification-rules/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  });

  return (
    <Box>
      <Typography variant="h4">Classification rules</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Automate how transactions are organized
      </Typography>

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Could not load rules.</Typography>}

      {data && (
        <>
          <Stack spacing={1.25}>
            {paginate(data).map((rule) => (
              <Paper key={rule.id} sx={{ p: 2, opacity: rule.active ? 1 : 0.55 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Typography sx={labelSx}>If</Typography>
                    <Chip label="Description" size="small" sx={pillSx} />
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>contains</Typography>
                    <Chip label={rule.pattern} size="small" sx={valuePillSx} />
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>→</Typography>
                    <Typography sx={labelSx}>Then</Typography>
                    <Chip label="Category" size="small" sx={pillSx} />
                    <Typography sx={{ fontSize: 13, color: '#7A868E' }}>=</Typography>
                    <Chip
                      label={rule.subcategory ? `${rule.category?.name ?? '-'} / ${rule.subcategory}` : rule.category?.name ?? '-'}
                      size="small"
                      sx={valuePillSx}
                    />
                  </Stack>
                  <Switch
                    checked={rule.active}
                    onChange={(e) => toggleMutation.mutate({ id: rule.id, active: e.target.checked })}
                  />
                </Stack>
              </Paper>
            ))}
            {data.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: '#7A868E' }}>No rules yet.</Typography>
              </Paper>
            )}
          </Stack>
          <TablePagination
            component="div"
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ mt: 1 }}
          />
        </>
      )}
    </Box>
  );
}
