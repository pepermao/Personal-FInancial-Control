import { normalizeDescription } from './normalize';

export interface ClassifyRule {
  pattern: string;
  categoryId: string;
  subcategory: string | null;
}

export interface Classification {
  categoryId: string;
  subcategory: string | null;
  source: 'rule' | 'pluggy';
}

/**
 * Pluggy category label -> Kevin top-level category name.
 *
 * Pluggy enriches every Open Finance transaction with an English label. Rules stay the
 * primary classifier — they encode what the user knows ("VITOR CANEPPELE CONSULTING" is
 * PJ income) — and this map only fills what no rule matched, which is the long tail of
 * small merchants no one will ever write a rule for.
 *
 * Labels are left out on purpose when they don't determine a category: "Transfers" and
 * "Third party transfers" are PIX to people, which may be a split bill, a gift or rent,
 * so they stay in review rather than be guessed.
 */
export const PLUGGY_CATEGORY_MAP: Readonly<Record<string, string>> = {
  'Same person transfer': 'Transferência Interna',
  'Credit card payment': 'Transferência Interna',

  Investments: 'Investimentos',
  'Fixed income': 'Investimentos',
  'Variable income': 'Investimentos',
  'Mutual funds': 'Investimentos',

  'Eating out': 'Alimentação',
  Groceries: 'Alimentação',
  'Food delivery': 'Alimentação',

  'Taxi and ride-hailing': 'Transporte',
  'Public transportation': 'Transporte',
  'Gas stations': 'Transporte',
  Parking: 'Transporte',
  'Tolls and in vehicle payment': 'Transporte',

  Leisure: 'Lazer',
  Tickets: 'Lazer',
  Travel: 'Lazer',
  Accomodation: 'Lazer',
  Accommodation: 'Lazer',
  'Airport and airlines': 'Lazer',
  'Video streaming': 'Lazer',
  'Music streaming': 'Lazer',
  Gaming: 'Lazer',

  Healthcare: 'Saúde',
  Pharmacy: 'Saúde',
  'Gyms and fitness centers': 'Saúde',
  'Hospital clinics and labs': 'Saúde',
  Dentist: 'Saúde',
  'Wellness and fitness': 'Saúde',

  Shopping: 'Compras',
  'Online shopping': 'Compras',
  Clothing: 'Compras',
  Bookstore: 'Compras',
  Electronics: 'Compras',
  'Pet supplies and vet': 'Compras',
  Houseware: 'Compras',
  'Sports goods': 'Compras',

  Services: 'Serviços',
  Telecommunications: 'Serviços',
  Internet: 'Serviços',
  Mobile: 'Serviços',
  Utilities: 'Serviços',
  Electricity: 'Serviços',
  Water: 'Serviços',

  Rent: 'Moradia',
  Taxes: 'Impostos',
  'Income taxes': 'Impostos',
  'Tax on financial operations': 'Impostos',

  'Digital services': 'Tecnologia',
};

/**
 * Picks a category for a transaction: first matching rule (rules arrive ordered by
 * priority), else the Kevin category Pluggy's label maps to, else null.
 *
 * `categoryIdByName` resolves the map's names to ids; a mapped name with no category in
 * the database is skipped rather than invented.
 */
export function classify(
  descriptionNormalized: string,
  pluggyCategory: string | null | undefined,
  rules: readonly ClassifyRule[],
  categoryIdByName: ReadonlyMap<string, string>,
): Classification | null {
  const rule = rules.find((r) => descriptionNormalized.includes(normalizeDescription(r.pattern)));
  if (rule) return { categoryId: rule.categoryId, subcategory: rule.subcategory, source: 'rule' };

  const name = pluggyCategory ? PLUGGY_CATEGORY_MAP[pluggyCategory] : undefined;
  const categoryId = name ? categoryIdByName.get(name) : undefined;
  if (categoryId) return { categoryId, subcategory: null, source: 'pluggy' };

  return null;
}
