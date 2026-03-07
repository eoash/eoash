export interface RevenueRow {
  month: string;
  segment: string;
  actual: number;
  target: number;
}

export interface RevenueMonthly {
  month: string;
  actual: number;
  target: number;
}

export interface RevenueSegment {
  segment: string;
  amount: number;
}

export interface CashPositionRow {
  region: string;
  bank: string;
  currency: string;
  balance: number;
  balanceUsd: number;
}

export interface CashRegionSummary {
  region: string;
  regionLabel: string;
  banks: { bank: string; currency: string; balance: number; balanceUsd: number }[];
  totalUsd: number;
}

export interface IncomeRow {
  month: string;
  category: string;
  amount: number;
  type: "revenue" | "expense";
}

export interface IncomeMonthly {
  month: string;
  revenue: number;
  expense: number;
  netIncome: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

export interface FxRate {
  pair: string;
  rate: number;
  change: number;
  date: string;
}

export interface FxHistoryPoint {
  date: string;
  usdKrw: number;
  usdVnd: number;
}
