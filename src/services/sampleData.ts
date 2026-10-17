import { YearBudgetData, SavingsLedgerData, BudgetEntry, SavingsAccount, SavingsTransaction, BudgetItemTemplate, EntryFrequency } from '../types/finance';

export const DEFAULT_SAVINGS_ACCOUNTS: SavingsAccount[] = [
  {
    id: 'acc-hysa',
    name: 'Maya Savings (Digital Bank 5.0% APY)',
    type: 'Digital Bank (High-Yield)',
    institution: 'Maya Bank',
    balance: 0,
    color: '#10b981', // emerald-500
    apy: 5.0,
  },
  {
    id: 'acc-brokerage',
    name: 'Pag-IBIG MP2 (Tax-Free Gov Dividend)',
    type: 'Pag-IBIG MP2 & Gov\'t Savings',
    institution: 'Pag-IBIG Fund',
    balance: 0,
    color: '#3b82f6', // blue-500
    apy: 7.05,
  },
  {
    id: 'acc-roth',
    name: 'BPI Express Teller / Checking',
    type: 'Traditional Bank (Savings / Checking)',
    institution: 'Bank of the Philippine Islands (BPI)',
    balance: 0,
    color: '#8b5cf6', // purple-500
    apy: 0.25,
  },
  {
    id: 'acc-emergency',
    name: 'Primary Emergency Buffer (SeaBank)',
    type: 'Emergency Fund',
    institution: 'SeaBank Philippines',
    balance: 0,
    color: '#f59e0b', // amber-500
    apy: 4.5,
  },
  {
    id: 'acc-gcash',
    name: 'GCash GSave / Wallet',
    type: 'E-Wallet',
    institution: 'GCash (Mynt)',
    balance: 0,
    color: '#06b6d4', // cyan-500
    apy: 2.6,
  },
];

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const isTemplateValidForPeriod = (
  tpl: BudgetItemTemplate,
  frequency: EntryFrequency,
  period: string
): boolean => {
  const tFreq = tpl.frequency || 'monthly';
  const tBi = tpl.biweeklyPeriod || 'both';

  if (frequency === 'monthly') {
    return tFreq === 'monthly' || tFreq === 'both';
  } else {
    if (tFreq !== 'bi-weekly' && tFreq !== 'both') return false;
    if (tBi === 'both') return true;
    const isP1 = period.endsWith('-P1') || period.includes('P1');
    const isP2 = period.endsWith('-P2') || period.includes('P2');
    if (tBi === 'P1' && isP1) return true;
    if (tBi === 'P2' && isP2) return true;
    return false;
  }
};

export const BIWEEKLY_PERIODS = MONTH_NAMES.flatMap((m, monthIdx) => [
  {
    id: `${m}-P1`,
    label: `${m}-P1`,
    index: monthIdx * 2,
    approxMonth: m,
  },
  {
    id: `${m}-P2`,
    label: `${m}-P2`,
    index: monthIdx * 2 + 1,
    approxMonth: m,
  },
]);

export const EXPENSE_CATEGORIES = [
  'Thites-Charity',
  'Budget-Bills',
  'Budget-Odiongan',
  'Budget',
  'House',
  'Liabilities',
  'Intertainment/Shopping/dine',
  'House Maintenance',
  'Car',
  'Savings',
  'other',
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'GCash Transfer',
  'Kath Account',
  'Checking Account',
  'Bank Transfer',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Extra Income (apartment rent)',
  '13th Month',
  'Extra Income/car rental',
  'Other Income',
];

export const SAVING_CATEGORIES = [
  'Savings',
  'Emergency Fund',
  'Pag-IBIG MP2',
  'Digital Bank (High-Yield)',
  'Traditional Bank Savings',
  'Time Deposit',
  'Investment / Stocks',
  'Mutual Funds / UITF',
  'Crypto & Digital Assets',
  'Retirement Fund (PERA)',
];

export const DEFAULT_ITEM_TEMPLATES: BudgetItemTemplate[] = [
  // Income
  { id: 'tpl-salary', type: 'income' as const, category: 'Salary', item: 'Salary', defaultEstimatedCost: 155000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-rent-inc', type: 'income' as const, category: 'Extra Income (apartment rent)', item: 'Extra Income (apartment rent)', defaultEstimatedCost: 0, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-13th', type: 'income' as const, category: '13th Month', item: '13th Month', defaultEstimatedCost: 0, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-car-inc', type: 'income' as const, category: 'Extra Income/car rental', item: 'Extra Income/car rental', defaultEstimatedCost: 0, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  // Expenses
  { id: 'tpl-thites', type: 'expense' as const, category: 'Thites-Charity', item: 'Thites', defaultEstimatedCost: 16000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-meralco', type: 'expense' as const, category: 'Budget-Bills', item: 'Meralco', defaultEstimatedCost: 3500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-water', type: 'expense' as const, category: 'Budget-Bills', item: 'Water', defaultEstimatedCost: 700, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-internet', type: 'expense' as const, category: 'Budget-Bills', item: 'Internet', defaultEstimatedCost: 750, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'GCash Transfer' },
  { id: 'tpl-mobile', type: 'expense' as const, category: 'Budget-Bills', item: 'Mobile load', defaultEstimatedCost: 500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'GCash Transfer' },
  { id: 'tpl-odiongan', type: 'expense' as const, category: 'Budget-Odiongan', item: 'Groceries/budget - odiongan', defaultEstimatedCost: 18000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-kath', type: 'expense' as const, category: 'Budget-Odiongan', item: 'kath allowance', defaultEstimatedCost: 4500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-zack', type: 'expense' as const, category: 'Budget-Odiongan', item: 'Zack allowance', defaultEstimatedCost: 3500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-medicine', type: 'expense' as const, category: 'Budget-Odiongan', item: 'Medicine', defaultEstimatedCost: 3000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-motor', type: 'expense' as const, category: 'Budget-Odiongan', item: 'Motorcycle Maintenance/ Gas', defaultEstimatedCost: 1500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-groc-me', type: 'expense' as const, category: 'Budget', item: 'Groceries - me', defaultEstimatedCost: 2000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-daily', type: 'expense' as const, category: 'Budget', item: 'Daily Budget', defaultEstimatedCost: 7500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-rice', type: 'expense' as const, category: 'Budget', item: 'Rice', defaultEstimatedCost: 1500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-gasul', type: 'expense' as const, category: 'Budget', item: 'Gasul', defaultEstimatedCost: 500, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-parents', type: 'expense' as const, category: 'Thites-Charity', item: 'Mama/Papa', defaultEstimatedCost: 6000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-mortgage', type: 'expense' as const, category: 'House', item: 'Pag-ibig Mortgage', defaultEstimatedCost: 35000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Checking Account' },
  { id: 'tpl-prulife', type: 'expense' as const, category: 'Liabilities', item: 'Credit Card - Prulife - 5k Monthly', defaultEstimatedCost: 5000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-gas-cc', type: 'expense' as const, category: 'Budget', item: 'Credit Card -Car Gas', defaultEstimatedCost: 2000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-stream', type: 'expense' as const, category: 'Intertainment/Shopping/dine', item: 'netflix/prime/Hbo', defaultEstimatedCost: 600, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-dine', type: 'expense' as const, category: 'Intertainment/Shopping/dine', item: 'dine and shoppe', defaultEstimatedCost: 20000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-house-maint', type: 'expense' as const, category: 'House Maintenance', item: 'House Maintenance', defaultEstimatedCost: 1000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-hoa', type: 'expense' as const, category: 'Liabilities', item: 'HOA monthly dues', defaultEstimatedCost: 1000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-car-maint', type: 'expense' as const, category: 'Car', item: 'Car Maintenance', defaultEstimatedCost: 5000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-savings', type: 'saving' as const, category: 'Savings', item: 'Savings', defaultEstimatedCost: 10000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-buffer', type: 'expense' as const, category: 'Budget', item: 'Buffer', defaultEstimatedCost: 3000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-dog', type: 'expense' as const, category: 'Budget', item: 'Dog food and others', defaultEstimatedCost: 1000, frequency: 'monthly' as const, biweeklyPeriod: 'both' as const, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
];

export function createEmptyYearBudget(year: number): YearBudgetData {
  return {
    year,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    entryMode: 'monthly',
    currency: '₱',
    entries: [],
    customCategories: {
      expense: [...EXPENSE_CATEGORIES],
      income: [...INCOME_CATEGORIES],
      saving: [...SAVING_CATEGORIES],
    },
    itemTemplates: [...DEFAULT_ITEM_TEMPLATES],
    budgets: [
      { category: 'House', type: 'expense', plannedAmount: 35000 },
      { category: 'Budget-Odiongan', type: 'expense', plannedAmount: 30000 },
      { category: 'Thites-Charity', type: 'expense', plannedAmount: 22000 },
      { category: 'Budget', type: 'expense', plannedAmount: 18000 },
      { category: 'Intertainment/Shopping/dine', type: 'expense', plannedAmount: 20000 },
      { category: 'Salary', type: 'income', plannedAmount: 160000 },
      { category: 'Savings', type: 'saving', plannedAmount: 10000 },
    ],
  };
}

export function generateInitial2026Budget(): YearBudgetData {
  return createEmptyYearBudget(2026);
}

export function generateInitialSavingsLedger(_initial2026Budget?: YearBudgetData): SavingsLedgerData {
  return {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    currency: "₱",
    initialCapital: 0,
    accounts: DEFAULT_SAVINGS_ACCOUNTS.map((acc) => ({
      ...acc,
      balance: 0,
    })),
    transactions: [],
  };
}
