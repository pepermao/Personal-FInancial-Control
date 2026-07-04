export enum Direction {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionType {
  PIX = 'PIX',
  CARD = 'CARD',
  BOLETO = 'BOLETO',
  TRANSFER = 'TRANSFER',
  RDB = 'RDB',
  FEE = 'FEE',
  TAX = 'TAX',
  OTHER = 'OTHER',
}

export enum TransactionNature {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  INVESTMENT = 'INVESTMENT',
  REDEMPTION = 'REDEMPTION',
  REIMBURSEMENT = 'REIMBURSEMENT',
}

export enum AssetType {
  CDB = 'CDB',
  LCI = 'LCI',
  LCA = 'LCA',
  TESOURO_SELIC = 'TESOURO_SELIC',
  TESOURO_IPCA = 'TESOURO_IPCA',
  TESOURO_PREFIXADO = 'TESOURO_PREFIXADO',
  POUPANCA = 'POUPANCA',
  ACOES = 'ACOES',
  FII = 'FII',
  REAL_ESTATE = 'REAL_ESTATE',
  OTHER = 'OTHER',
}

export enum ProfitRateType {
  PREFIXADO = 'PREFIXADO',
  CDI_PERCENTAGE = 'CDI_PERCENTAGE',
  IPCA_PLUS = 'IPCA_PLUS',
  SELIC_PLUS = 'SELIC_PLUS',
  POUPANCA = 'POUPANCA',
  NONE = 'NONE',
}

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT',
  OTHER = 'OTHER',
}

export interface BankDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDto {
  id: string;
  bankId: string;
  name: string;
  type: AccountType;
  accountNumber: string | null;
  initialBalance: string;
  currentBalance: string;
  notes: string | null;
  bank?: BankDto;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationRuleDto {
  id: string;
  pattern: string;
  categoryId: string;
  subcategory: string | null;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDto {
  id: string;
  accountId: string;
  date: string;
  competenceMonth: string;
  descriptionRaw: string;
  descriptionNormalized: string;
  amount: string;
  direction: Direction;
  type: TransactionType;
  counterparty: string | null;
  categoryId: string | null;
  subcategory: string | null;
  nature: TransactionNature;
  impactsDashboardIncome: boolean;
  impactsDashboardExpense: boolean;
  impactsAccountBalance: boolean;
  fingerprint: string;
  importBatchId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDto {
  id: string;
  name: string;
  type: AssetType;
  value: string;
  profitRateType: ProfitRateType;
  profitRate: string | null;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchDto {
  id: string;
  filename: string;
  accountId: string;
  imported: number;
  duplicated: number;
  needsReview: number;
  historical: boolean;
  endBalance: string | null;
  createdAt: string;
}

export interface ReclassifyResultDto {
  scanned: number;
  updated: number;
}

export interface ImportSummaryDto {
  imported: number;
  duplicated: number;
  needsReview: number;
  historical: boolean;
}

export interface DashboardSummaryDto {
  periodType: 'month' | 'year';
  month: string | null;
  year: string;
  earliestMonth: string | null;
  latestMonth: string | null;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  byCategory: Array<{ categoryId: string | null; categoryName: string; total: string }>;
  byAccount: Array<{ accountId: string; accountName: string; bankName: string; balance: string }>;
  totalAccountsBalance: string;
  totalInvestments: string;
  totalRealEstate: string;
  totalAssetsValue: string;
  netWorth: string;
}
