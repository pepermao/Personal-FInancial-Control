import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { AssetType, ProfitRateType } from '@ledger/shared';
import type { AssetDto } from '@ledger/shared';
import { formatBRL } from '../utils/format';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.CDB]: 'CDB',
  [AssetType.LCI]: 'LCI',
  [AssetType.LCA]: 'LCA',
  [AssetType.TESOURO_SELIC]: 'Tesouro Selic',
  [AssetType.TESOURO_IPCA]: 'Tesouro IPCA+',
  [AssetType.TESOURO_PREFIXADO]: 'Tesouro Prefixado',
  [AssetType.POUPANCA]: 'Poupança',
  [AssetType.ACOES]: 'Ações',
  [AssetType.FII]: 'FII',
  [AssetType.OTHER]: 'Outro',
};

export const ASSET_TYPE_COLORS: Record<AssetType, { bg: string; color: string }> = {
  [AssetType.CDB]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.LCI]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.LCA]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.TESOURO_SELIC]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.TESOURO_IPCA]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.TESOURO_PREFIXADO]: { bg: '#EAF7F1', color: 'success.main' },
  [AssetType.POUPANCA]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.ACOES]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.FII]: { bg: '#EEF1F3', color: '#3B4E5C' },
  [AssetType.OTHER]: { bg: '#F1F3F5', color: '#55636E' },
};

export const PROFIT_RATE_TYPE_LABELS: Record<ProfitRateType, string> = {
  [ProfitRateType.PREFIXADO]: 'Prefixado (% a.a.)',
  [ProfitRateType.CDI_PERCENTAGE]: '% do CDI',
  [ProfitRateType.IPCA_PLUS]: 'IPCA+',
  [ProfitRateType.SELIC_PLUS]: 'Selic+',
  [ProfitRateType.POUPANCA]: 'Poupança',
  [ProfitRateType.NONE]: 'Sem rentabilidade',
};

// A generic "other" holding carries no quoted market rate.
export const TYPES_WITHOUT_RATE = new Set<AssetType>([AssetType.OTHER]);

export const INVESTMENT_TYPES = Object.values(AssetType);

export function sumValue(assets: AssetDto[]) {
  return assets.reduce((sum, asset) => sum + Number(asset.value), 0);
}

export function formatProfitRate(asset: AssetDto): string | null {
  switch (asset.profitRateType) {
    case ProfitRateType.PREFIXADO:
      return asset.profitRate ? `${asset.profitRate}% a.a.` : null;
    case ProfitRateType.CDI_PERCENTAGE:
      return asset.profitRate ? `${asset.profitRate}% do CDI` : null;
    case ProfitRateType.IPCA_PLUS:
      return asset.profitRate ? `IPCA + ${asset.profitRate}% a.a.` : null;
    case ProfitRateType.SELIC_PLUS:
      return asset.profitRate ? `Selic + ${asset.profitRate}% a.a.` : null;
    case ProfitRateType.POUPANCA:
      return 'Poupança';
    default:
      return null;
  }
}

export function AssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: AssetDto;
  onEdit: (asset: AssetDto) => void;
  onDelete: (asset: AssetDto) => void;
}) {
  const typeColor = ASSET_TYPE_COLORS[asset.type];
  const rateLabel = formatProfitRate(asset);
  return (
    <Paper sx={{ p: 2.25, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{asset.name}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            {new Date(asset.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </Typography>
        </Box>
        <Chip
          label={ASSET_TYPE_LABELS[asset.type]}
          size="small"
          sx={{ bgcolor: typeColor.bg, color: typeColor.color }}
        />
      </Stack>
      <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', mt: 2 }}>
        {formatBRL(asset.value)}
      </Typography>
      {rateLabel && (
        <Typography sx={{ fontSize: 12, color: 'success.main', fontWeight: 700, mt: 0.5 }}>{rateLabel}</Typography>
      )}
      <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
        <IconButton size="small" onClick={() => onEdit(asset)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(asset)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
}
