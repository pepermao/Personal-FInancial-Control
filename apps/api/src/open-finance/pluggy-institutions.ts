/**
 * COMPE bank code → institution name.
 *
 * Pluggy's own `connector.name` is useless for naming here: every MeuPluggy-proxied item
 * reports the connector as "MeuPluggy", not the bank behind it. The COMPE code embedded in
 * `bankData.transferNumber` is the only reliable institution signal the API exposes.
 *
 * Deliberately short. An unknown code falls back to the name Pluggy gave the account, which
 * is wordy but never wrong — better than guessing an institution.
 */
const COMPE_NAMES: Readonly<Record<string, string>> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '077': 'Banco Inter',
  '102': 'XP Investimentos',
  '104': 'Caixa Econômica Federal',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '290': 'PagBank',
  '323': 'Mercado Pago',
  '336': 'C6 Bank',
  '341': 'Itaú',
  '348': 'Banco XP',
  '380': 'PicPay',
  '422': 'Banco Safra',
  '735': 'Neon',
  '756': 'Sicoob',
};

export function institutionNameForCompe(compe: string | null): string | null {
  if (!compe) return null;
  return COMPE_NAMES[compe] ?? null;
}
