import type { ReactNode } from 'react';
import type { DashboardSummaryDto } from '@kevin/shared';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatBRL } from '../../utils/format';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface CardShellProps {
  icon: ReactNode;
  label: string;
  total: string;
  totalColor?: string;
  caption?: string;
  children?: ReactNode;
}

function CardShell({ icon, label, total, totalColor, caption, children }: CardShellProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ color: 'text.secondary', display: 'flex', fontSize: 18 }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
      </Stack>

      <Typography
        sx={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', mt: 1, color: totalColor }}
      >
        {formatBRL(total)}
      </Typography>
      {caption && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{caption}</Typography>
      )}

      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Paper>
  );
}

/** A labelled share bar — the shape Pluggy uses for both bank split and asset classes. */
function ShareRow({
  label,
  sub,
  value,
  sharePct,
  color,
}: {
  label: string;
  sub?: string;
  value: string;
  sharePct: number;
  color: string;
}) {
  return (
    <Box sx={{ '& + &': { mt: 1.5 } }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
          {label}
          {sub && (
            <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5 }}>
              {sub}
            </Typography>
          )}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{sharePct}%</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatBRL(value)}</Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        // A share can round to 0% and still hold money; clamp so the row stays visible.
        value={Math.min(100, Math.max(sharePct, 1))}
        sx={{
          height: 4,
          borderRadius: 2,
          mt: 0.75,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 2 },
        }}
      />
    </Box>
  );
}

export function OverviewCards({ data }: { data: DashboardSummaryDto }) {
  const assetCount = data.investmentClasses.reduce((sum, c) => sum + c.count, 0);
  const classColors = ['primary.main', 'success.main', 'warning.main', 'info.main'];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <CardShell
          icon={<AccountBalanceIcon fontSize="inherit" />}
          label="Contas bancárias"
          total={data.totalBankBalance}
          caption={
            data.banks.length > 0
              ? plural(data.banks.length, 'instituição', 'instituições')
              : undefined
          }
        >
          {data.banks.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Nenhuma conta conectada.
            </Typography>
          ) : (
            data.banks.map((bank) => (
              <ShareRow
                key={bank.bankId}
                label={bank.bankName}
                sub={`· ${plural(bank.accountCount, 'conta', 'contas')}`}
                value={bank.balance}
                sharePct={bank.sharePct}
                color="success.main"
              />
            ))
          )}
        </CardShell>
      </Grid>

      <Grid item xs={12} md={4}>
        <CardShell
          icon={<CreditCardIcon fontSize="inherit" />}
          label="Cartões de crédito"
          total={data.totalCreditCardDebt}
          totalColor={Number(data.totalCreditCardDebt) > 0 ? 'error.main' : undefined}
          caption={
            data.creditCards.length > 0
              ? plural(data.creditCards.length, 'cartão', 'cartões')
              : undefined
          }
        >
          {data.creditCards.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Nenhum cartão conectado.
            </Typography>
          ) : (
            data.creditCards.map((card) => {
              const due = formatDueDate(card.dueDate);
              return (
                <Box key={card.accountId} sx={{ '& + &': { mt: 2 } }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {card.accountName}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'error.main' }}>
                      {formatBRL(card.used)}
                    </Typography>
                  </Stack>
                  {card.limit && (
                    <>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, card.usedPct ?? 0)}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          mt: 0.75,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'error.main',
                            borderRadius: 2,
                          },
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {card.usedPct}% utilizado
                          {due && ` · vence ${due}`}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          Limite: {formatBRL(card.limit)}
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Box>
              );
            })
          )}
        </CardShell>
      </Grid>

      <Grid item xs={12} md={4}>
        <CardShell
          icon={<TrendingUpIcon fontSize="inherit" />}
          label="Investimentos"
          total={data.totalInvestments}
          totalColor={Number(data.totalInvestments) > 0 ? 'success.main' : undefined}
          caption={
            assetCount > 0
              ? `${plural(data.investmentClasses.length, 'classe', 'classes')} · ${plural(assetCount, 'ativo', 'ativos')}`
              : undefined
          }
        >
          {data.investmentClasses.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Nenhum investimento registrado.
            </Typography>
          ) : (
            data.investmentClasses.map((entry, index) => (
              <ShareRow
                key={entry.className}
                label={entry.className}
                sub={`(${entry.count})`}
                value={entry.value}
                sharePct={entry.sharePct}
                color={classColors[index % classColors.length]}
              />
            ))
          )}
        </CardShell>
      </Grid>
    </Grid>
  );
}
