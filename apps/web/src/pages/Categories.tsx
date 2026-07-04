import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { apiClient } from '../api/client';
import type { CategoryDto, DashboardSummaryDto } from '@ledger/shared';

async function fetchCategories() {
  const { data } = await apiClient.get<CategoryDto[]>('/categories');
  return data;
}

async function fetchSummary(month: string) {
  const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary', { params: { month } });
  return data;
}

export function CategoriesPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary', month], queryFn: () => fetchSummary(month) });

  const totalsByCategory = new Map(summary?.byCategory.map((c) => [c.categoryId, c]) ?? []);
  const topLevel = data?.filter((category) => !category.parentId) ?? [];

  return (
    <Box>
      <Typography variant="h4">Categorias</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Padrões de gastos por categoria
      </Typography>

      {isLoading && <Typography>Carregando...</Typography>}
      {isError && <Typography color="error">Não foi possível carregar as categorias.</Typography>}

      {data && (
        <Grid container spacing={2}>
          {topLevel.map((category) => {
            const stats = totalsByCategory.get(category.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Paper sx={{ p: 2.25, height: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{category.name}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', mt: 1 }}>
                    {stats ? `R$ ${stats.total}` : 'R$ 0.00'}
                  </Typography>
                  {!stats && (
                    <Typography sx={{ fontSize: 12, color: '#7A868E', mt: 0.5 }}>Nenhum gasto este mês</Typography>
                  )}
                </Paper>
              </Grid>
            );
          })}
          {topLevel.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: '#7A868E' }}>Nenhuma categoria ainda.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
