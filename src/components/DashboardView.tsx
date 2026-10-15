import React, { useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Receipt,
  PiggyBank,
  Percent,
  PlusCircle,
  Cloud,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { YearBudgetData, SavingsLedgerData, EntryFrequency, EntryType } from '../types/finance';
import { CashflowChart } from './charts/CashflowChart';
import { CapitalGrowthChart } from './charts/CapitalGrowthChart';
import { CategoryDonutChart } from './charts/CategoryDonutChart';

interface DashboardViewProps {
  budget: YearBudgetData;
  ledger: SavingsLedgerData;
  frequency: EntryFrequency;
  onOpenAddEntry: (type?: EntryType) => void;
  onNavigateToSavings: () => void;
  onNavigateToBudget: () => void;
  onNavigateToDrive: () => void;
  currencySymbol?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  budget,
  ledger,
  frequency,
  onOpenAddEntry,
  onNavigateToSavings,
  onNavigateToBudget,
  onNavigateToDrive,
  currencySymbol = '$',
}) => {
  const [donutType, setDonutType] = useState<EntryType>('expense');

  // Compute KPI metrics
  const totalIncome = budget.entries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = budget.entries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSavings = budget.entries
    .filter((e) => e.type === 'saving')
    .reduce((sum, e) => sum + e.amount, 0);

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const netCashflow = totalIncome - totalExpenses - totalSavings;

  // Latest capital from ledger
  const currentTotalCapital =
    ledger.transactions.length > 0
      ? ledger.transactions[ledger.transactions.length - 1].runningTotalCapital ||
        ledger.initialCapital
      : ledger.initialCapital;

  const startingCapital = ledger.initialCapital || 0;
  const capitalGrowth = currentTotalCapital - startingCapital;
  const capitalGrowthPct = startingCapital > 0 ? (capitalGrowth / startingCapital) * 100 : 0;

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6">
      
      {/* Welcome & Top Action Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-200 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{budget.year} Financial Overview &amp; Capital Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Annual Financial Performance
            </h1>
            <p className="mt-1 text-sm text-indigo-200 max-w-xl">
              Track your inflows, living expenses, and automated accumulation into your Google Drive capital growth ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenAddEntry()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={onNavigateToBudget}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl backdrop-blur-xs border border-white/15 transition-all cursor-pointer"
            >
              View Budget Table
            </button>
            <button
              onClick={onNavigateToSavings}
              className="px-4 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100 font-medium text-xs rounded-xl border border-indigo-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PiggyBank className="w-4 h-4 text-emerald-300" />
              <span>Savings Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Assets / Capital */}
        <div
          onClick={onNavigateToSavings}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Assets &amp; Capital
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {currencySymbol}{formatNumber(currentTotalCapital)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{currencySymbol}{formatNumber(capitalGrowth)} ({capitalGrowthPct.toFixed(1)}%)</span>
            <span className="text-slate-400 text-[10px]">in ledger</span>
          </div>
        </div>

        {/* YTD Income */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {budget.year} Total Inflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {currencySymbol}{formatNumber(totalIncome)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Avg {currencySymbol}{formatNumber(totalIncome / (budget.entries.length > 0 ? 10 : 1))}/mo</span>
          </div>
        </div>

        {/* YTD Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {budget.year} Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {currencySymbol}{formatNumber(totalExpenses)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{((totalExpenses / (totalIncome || 1)) * 100).toFixed(0)}% of total income</span>
          </div>
        </div>

        {/* YTD Savings & Savings Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {budget.year} Savings Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {savingsRate.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              ({currencySymbol}{formatNumber(totalSavings)})
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Flows into separate ledger</span>
          </div>
        </div>

      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Monthly/Bi-Weekly Cashflow Performance Chart */}
        <div className="lg:col-span-8">
          <CashflowChart
            entries={budget.entries}
            frequency={frequency}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Right: Category Distribution Donut */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Category Breakdown
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setDonutType('expense')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  donutType === 'expense'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => setDonutType('saving')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  donutType === 'saving'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Saving
              </button>
              <button
                onClick={() => setDonutType('income')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  donutType === 'income'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="flex-1">
            <CategoryDonutChart
              entries={budget.entries}
              type={donutType}
              currencySymbol={currencySymbol}
            />
          </div>
        </div>

      </div>

      {/* Bottom Chart: Capital Growth & Savings Ledger Accumulation */}
      <div>
        <CapitalGrowthChart ledger={ledger} currencySymbol={currencySymbol} />
      </div>

      {/* Quick Summary / Google Drive Integration Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Google Drive Cloud Database
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data is saved as <code className="font-mono text-indigo-600 dark:text-indigo-400">capitalflow_budget_{budget.year}.json</code> (current year only) and <code className="font-mono text-indigo-600 dark:text-indigo-400">capitalflow_savings_ledger.json</code> (multi-year capital).
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToDrive}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
        >
          <span>Manage Google Drive Files</span>
        </button>
      </div>

    </div>
  );
};
