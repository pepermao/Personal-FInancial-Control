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

export enum CategoryKind {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  INVESTMENT = 'INVESTMENT',
  REIMBURSEMENT = 'REIMBURSEMENT',
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
  kind: CategoryKind;
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
  assetId: string | null;
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
  skipped: number;
  historical: boolean;
}

export interface BulkImportResultItem {
  filename: string;
  ok: boolean;
  imported?: number;
  duplicated?: number;
  needsReview?: number;
  skipped?: number;
  historical?: boolean;
  error?: string;
}

export interface BulkImportResultDto {
  results: BulkImportResultItem[];
}

export interface DashboardSummaryDto {
  periodType: 'month' | 'year';
  month: string | null;
  year: string;
  earliestMonth: string | null;
  latestMonth: string | null;
  totalIncome: string;
  /** Net expense = grossExpense - reimbursements. Can be negative if reimbursements exceed spending. */
  totalExpense: string;
  grossExpense: string;
  reimbursements: string;
  balance: string;
  byCategory: Array<{ categoryId: string | null; categoryName: string; total: string }>;
  byAccount: Array<{ accountId: string; accountName: string; bankName: string; balance: string }>;
  /** Every account netted together, credit-card debt included. Kept for callers that want one figure. */
  totalAccountsBalance: string;
  /** Cash only — credit cards excluded, because a card is a liability rather than a smaller balance. */
  totalBankBalance: string;
  /** Positive amount owed across credit cards. */
  totalCreditCardDebt: string;
  banks: Array<{
    bankId: string;
    bankName: string;
    balance: string;
    accountCount: number;
    sharePct: number;
  }>;
  creditCards: Array<{
    accountId: string;
    accountName: string;
    accountNumber: string | null;
    used: string;
    /** Null when the institution does not report a limit. */
    limit: string | null;
    available: string | null;
    usedPct: number | null;
    dueDate: string | null;
  }>;
  investmentClasses: Array<{
    className: string;
    value: string;
    count: number;
    sharePct: number;
  }>;
  /** Recorded Asset positions, excluding real estate. Never inferred from transactions. */
  totalInvestments: string;
  netWorth: string;
}

export interface CashFlowPointDto {
  /** "01"-"12" for monthly granularity, "01"-"31" for daily granularity. */
  label: string;
  income: string;
  expense: string;
}

export interface CashFlowDto {
  granularity: 'month' | 'day';
  series: CashFlowPointDto[];
}

export interface NetWorthPointDto {
  /** "YYYY-MM" */
  label: string;
  netWorth: string;
}

export interface NetWorthHistoryDto {
  series: NetWorthPointDto[];
}

/** A bank connection established through the Pluggy Connect widget. */
export interface PluggyConnectionDto {
  id: string;
  /** Pluggy's Item ID — the handle every data call is scoped by. */
  itemId: string;
  connectorName: string;
  connectorId: number | null;
  /** Pluggy item status: UPDATED, UPDATING, LOGIN_ERROR, OUTDATED, WAITING_USER_INPUT. */
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Short-lived token (30 min) that authorises the Pluggy Connect widget in the browser. */
export interface ConnectTokenDto {
  accessToken: string;
}
