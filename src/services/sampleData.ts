import { YearBudgetData, SavingsLedgerData, BudgetEntry, SavingsAccount, SavingsTransaction } from '../types/finance';

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

export const DEFAULT_ITEM_TEMPLATES = [
  // Income
  { id: 'tpl-salary', type: 'income', category: 'Salary', item: 'Salary', defaultEstimatedCost: 155000, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-rent-inc', type: 'income', category: 'Extra Income (apartment rent)', item: 'Extra Income (apartment rent)', defaultEstimatedCost: 0, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-13th', type: 'income', category: '13th Month', item: '13th Month', defaultEstimatedCost: 0, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-car-inc', type: 'income', category: 'Extra Income/car rental', item: 'Extra Income/car rental', defaultEstimatedCost: 0, defaultPaymentMethod: 'Bank Transfer' },
  // Expenses
  { id: 'tpl-thites', type: 'expense', category: 'Thites-Charity', item: 'Thites', defaultEstimatedCost: 16000, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-meralco', type: 'expense', category: 'Budget-Bills', item: 'Meralco', defaultEstimatedCost: 3500, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-water', type: 'expense', category: 'Budget-Bills', item: 'Water', defaultEstimatedCost: 700, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-internet', type: 'expense', category: 'Budget-Bills', item: 'Internet', defaultEstimatedCost: 750, defaultPaymentMethod: 'GCash Transfer' },
  { id: 'tpl-mobile', type: 'expense', category: 'Budget-Bills', item: 'Mobile load', defaultEstimatedCost: 500, defaultPaymentMethod: 'GCash Transfer' },
  { id: 'tpl-odiongan', type: 'expense', category: 'Budget-Odiongan', item: 'Groceries/budget - odiongan', defaultEstimatedCost: 18000, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-kath', type: 'expense', category: 'Budget-Odiongan', item: 'kath allowance', defaultEstimatedCost: 4500, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-zack', type: 'expense', category: 'Budget-Odiongan', item: 'Zack allowance', defaultEstimatedCost: 3500, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-medicine', type: 'expense', category: 'Budget-Odiongan', item: 'Medicine', defaultEstimatedCost: 3000, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-motor', type: 'expense', category: 'Budget-Odiongan', item: 'Motorcycle Maintenance/ Gas', defaultEstimatedCost: 1500, defaultPaymentMethod: 'Kath Account', toBeWithdrawn: true },
  { id: 'tpl-groc-me', type: 'expense', category: 'Budget', item: 'Groceries - me', defaultEstimatedCost: 2000, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-daily', type: 'expense', category: 'Budget', item: 'Daily Budget', defaultEstimatedCost: 7500, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-rice', type: 'expense', category: 'Budget', item: 'Rice', defaultEstimatedCost: 1500, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-gasul', type: 'expense', category: 'Budget', item: 'Gasul', defaultEstimatedCost: 500, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-parents', type: 'expense', category: 'Thites-Charity', item: 'Mama/Papa', defaultEstimatedCost: 6000, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-mortgage', type: 'expense', category: 'House', item: 'Pag-ibig Mortgage', defaultEstimatedCost: 35000, defaultPaymentMethod: 'Checking Account' },
  { id: 'tpl-prulife', type: 'expense', category: 'Liabilities', item: 'Credit Card - Prulife - 5k Monthly', defaultEstimatedCost: 5000, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-gas-cc', type: 'expense', category: 'Budget', item: 'Credit Card -Car Gas', defaultEstimatedCost: 2000, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-stream', type: 'expense', category: 'Intertainment/Shopping/dine', item: 'netflix/prime/Hbo', defaultEstimatedCost: 600, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-dine', type: 'expense', category: 'Intertainment/Shopping/dine', item: 'dine and shoppe', defaultEstimatedCost: 20000, defaultPaymentMethod: 'Credit Card' },
  { id: 'tpl-house-maint', type: 'expense', category: 'House Maintenance', item: 'House Maintenance', defaultEstimatedCost: 1000, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
  { id: 'tpl-hoa', type: 'expense', category: 'Liabilities', item: 'HOA monthly dues', defaultEstimatedCost: 1000, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-car-maint', type: 'expense', category: 'Car', item: 'Car Maintenance', defaultEstimatedCost: 5000, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-savings', type: 'saving', category: 'Savings', item: 'Savings', defaultEstimatedCost: 10000, defaultPaymentMethod: 'Bank Transfer' },
  { id: 'tpl-buffer', type: 'expense', category: 'Budget', item: 'Buffer', defaultEstimatedCost: 3000, defaultPaymentMethod: 'Cash' },
  { id: 'tpl-dog', type: 'expense', category: 'Budget', item: 'Dog food and others', defaultEstimatedCost: 1000, defaultPaymentMethod: 'Cash', toBeWithdrawn: true },
] as const;

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
