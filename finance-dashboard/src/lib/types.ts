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

export interface RevenueSubItem {
  name: string;
  monthly: number[];
  total: number;
}

export interface RevenueSegmentDetail {
  segment: string;
  items: RevenueSubItem[];
  subtotal: number[];
  headcount: number[];
  perPerson: number[];
  total: number;
}

export interface CashPositionRow {
  region: string;
  bank: string;
  currency: string;
  balance: number;
  balanceUsd: number;
}

export interface CashRegionData {
  region: string;
  regionLabel: string;
  balanceKrw: number;
  inflowsKrw: number;
  outflowsKrw: number;
  netChangeKrw: number;
  balanceLocal: number;
  localCurrency: string;
}

export interface CashRegionSummary {
  region: string;
  regionLabel: string;
  banks: { bank: string; currency: string; balance: number; balanceUsd: number }[];
  totalUsd: number;
}

export interface CashMonthly {
  month: string;
  regions: CashRegionData[];
  totalBalanceKrw: number;
  totalInflowsKrw: number;
  totalOutflowsKrw: number;
  totalNetChangeKrw: number;
}

export type CurrencyUnit = "KRW" | "USD" | "VND";

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

export interface YoYRow {
  year: string;
  monthly: number[];
  total: number;
  headcount: number;
  perPerson: number;
  target?: number;
}

export interface ClientRevenue {
  client: string;
  totalAmount: number;
  invoiceCount: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  avgCollectionDays: number;
}

export interface ArInvoice {
  month: string;
  client: string;
  amount: number;
  description: string;
  invoiceDate: string;
  paymentDate: string | null;
  collectionDays: number;
  status: "paid" | "unpaid" | "checking" | "scheduled";
  note: string;
  agingDays: number;
  risk: "green" | "yellow" | "orange" | "red";
}

export interface ArAgingBucket {
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface ArClientSummary {
  client: string;
  totalOutstanding: number;
  invoiceCount: number;
  oldestDays: number;
  risk: "green" | "yellow" | "orange" | "red";
}
