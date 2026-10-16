import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Filter,
  Search,
  Trash2,
  Calendar,
  PiggyBank,
  TrendingUp,
  Receipt,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Building2,
  AlertTriangle,
  Coins,
  ChevronRight,
  Info,
  FileSpreadsheet,
  Table,
} from 'lucide-react';
import {
  BudgetEntry,
  YearBudgetData,
  EntryFrequency,
  EntryType,
  SavingsAccount,
  BudgetItemTemplate,
} from '../types/finance';
import {
  MONTH_NAMES,
  BIWEEKLY_PERIODS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVING_CATEGORIES,
  DEFAULT_ITEM_TEMPLATES,
} from '../services/sampleData';

import { BudgetSpreadsheetView } from './BudgetSpreadsheetView';
import { CategoryAndTemplateManagerModal } from './CategoryAndTemplateManagerModal';

interface BudgetEntryViewProps {
  budget: YearBudgetData;
  accounts: SavingsAccount[];
  frequency: EntryFrequency;
  onChangeFrequency: (freq: EntryFrequency) => void;
  onAddEntry: (entry: Omit<BudgetEntry, 'id' | 'createdAt'>) => void;
  onAddMultipleEntries?: (entries: Omit<BudgetEntry, 'id' | 'createdAt'>[]) => void;
  onUpdateEntry?: (entryId: string, updated: Partial<BudgetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateCategories: (customCats: {
    expense: string[];
    income: string[];
    saving: string[];
  }) => void;
  onUpdateTemplates: (templates: BudgetItemTemplate[]) => void;
  currencySymbol?: string;
}

export const BudgetEntryView: React.FC<BudgetEntryViewProps> = ({
  budget,
  accounts,
  frequency,
  onChangeFrequency,
  onAddEntry,
  onAddMultipleEntries,
  onUpdateEntry,
  onDeleteEntry,
  onUpdateCategories,
  onUpdateTemplates,
  currencySymbol = '₱',
}) => {
  const [viewLayout, setViewLayout] = useState<'spreadsheet' | 'standard'>(() => {
    try {
      const saved = localStorage.getItem('capitalflow_budget_layout');
      if (saved === 'standard' || saved === 'spreadsheet') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'spreadsheet';
  });

  const handleSetViewLayout = (layout: 'spreadsheet' | 'standard') => {
    setViewLayout(layout);
    try {
      localStorage.setItem('capitalflow_budget_layout', layout);
    } catch {
      // ignore
    }
  };
  const currentMonthName = MONTH_NAMES[new Date().getMonth()] || 'Jan';
  const currentBiWeeklyPeriod = `${currentMonthName}-${new Date().getDate() <= 15 ? 'P1' : 'P2'}`;
  const defaultPeriod = frequency === 'monthly' ? currentMonthName : currentBiWeeklyPeriod;
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>(defaultPeriod);

  // Sync default period when frequency changes
  useEffect(() => {
    if (frequency === 'monthly') {
      if (!MONTH_NAMES.includes(selectedPeriodFilter) && selectedPeriodFilter !== 'all') {
        const match = selectedPeriodFilter.match(/^([A-Za-z]+)-P[12]$/);
        if (match && MONTH_NAMES.includes(match[1])) {
          setSelectedPeriodFilter(match[1]);
        } else {
          setSelectedPeriodFilter(currentMonthName);
        }
      }
    } else {
      if (!BIWEEKLY_PERIODS.some((p) => p.id === selectedPeriodFilter) && selectedPeriodFilter !== 'all') {
        if (MONTH_NAMES.includes(selectedPeriodFilter)) {
          setSelectedPeriodFilter(`${selectedPeriodFilter}-P1`);
        } else {
          setSelectedPeriodFilter(currentBiWeeklyPeriod);
        }
      }
    }
  }, [frequency, currentMonthName, currentBiWeeklyPeriod, selectedPeriodFilter]);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSplitterOpen, setIsSplitterOpen] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Active Categories & Templates
  const expenseCategories = budget.customCategories?.expense || [...EXPENSE_CATEGORIES];
  const incomeCategories = budget.customCategories?.income || [...INCOME_CATEGORIES];
  const savingCategories = budget.customCategories?.saving || [...SAVING_CATEGORIES];
  const itemTemplates = budget.itemTemplates || [...DEFAULT_ITEM_TEMPLATES];

  // Modal period mode and selection
  const [modalFrequency, setModalFrequency] = useState<EntryFrequency>(frequency);
  const [modalPeriod, setModalPeriod] = useState<string>(
    frequency === 'monthly' ? currentMonthName : currentBiWeeklyPeriod
  );

  // Form state for new entry
  const [formType, setFormType] = useState<EntryType>('expense');
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0].replace(/^\d{4}/, String(budget.year))
  );
  const [formCategory, setFormCategory] = useState<string>(expenseCategories[0] || 'Budget');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formAccountId, setFormAccountId] = useState<string>(accounts[0]?.id || '');

  // Paycheck splitter state
  const [splitterPaycheck, setSplitterPaycheck] = useState<string>('3600');
  const [splitterRent, setSplitterRent] = useState<string>('1200');
  const [splitterGroceries, setSplitterGroceries] = useState<string>('350');
  const [splitterSavings, setSplitterSavings] = useState<string>('1000');
  const [splitterAccountId, setSplitterAccountId] = useState<string>(accounts[0]?.id || '');
  const [splitterPeriod, setSplitterPeriod] = useState<string>(
    frequency === 'monthly' ? currentMonthName : currentBiWeeklyPeriod
  );

  // Get approximate date string for a period
  const getRepresentativeDateForPeriod = (period: string, freq: EntryFrequency, yr: number) => {
    if (freq === 'monthly') {
      const monthIdx = MONTH_NAMES.indexOf(period);
      const safeMonth = monthIdx >= 0 ? monthIdx + 1 : 1;
      return `${yr}-${String(safeMonth).padStart(2, '0')}-01`;
    } else {
      // Matches Month-P1, Month-P2 (e.g. Jan-P1, Oct-P2)
      const match = period.match(/^([A-Za-z]{3})-P([12])$/);
      if (match) {
        const mStr = match[1];
        const pNum = parseInt(match[2], 10);
        const mIdx = MONTH_NAMES.indexOf(mStr);
        const safeMonth = mIdx >= 0 ? mIdx + 1 : 1;
        const day = pNum === 1 ? '01' : '16';
        return `${yr}-${String(safeMonth).padStart(2, '0')}-${day}`;
      }
      const matchOld = period.match(/\d+/);
      const pNum = matchOld ? parseInt(matchOld[0], 10) : 1;
      const targetDate = new Date(yr, 0, 1 + (pNum - 1) * 14);
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      return `${yr}-${m}-${d}`;
    }
  };

  // Open modal with pre-selected period from current filter or active month
  const handleOpenAddModal = (presetPeriod?: string) => {
    const targetPeriod =
      presetPeriod && presetPeriod !== 'all'
        ? presetPeriod
        : selectedPeriodFilter !== 'all'
        ? selectedPeriodFilter
        : frequency === 'monthly'
        ? currentMonthName
        : currentBiWeeklyPeriod;

    setModalFrequency(frequency);
    setModalPeriod(targetPeriod);
    setFormDate(getRepresentativeDateForPeriod(targetPeriod, frequency, budget.year));
    
    // In entry modal the estimate text should already populated if it has an estimate amount
    const firstTpl = itemTemplates.find((t) => t.type === formType);
    if (firstTpl && firstTpl.defaultEstimatedCost > 0) {
      setSelectedTemplateId(firstTpl.id);
      setFormCategory(firstTpl.category);
      setFormDescription(firstTpl.item);
      setFormAmount(String(firstTpl.defaultEstimatedCost));
    } else {
      setFormAmount('');
      setFormDescription('');
    }
    setIsAddModalOpen(true);
  };

  // Update modal period & sync representative date
  const handleModalPeriodChange = (newPeriod: string) => {
    setModalPeriod(newPeriod);
    setFormDate(getRepresentativeDateForPeriod(newPeriod, modalFrequency, budget.year));
  };

  // Compute stats for modal selected period
  const periodStats = useMemo(() => {
    const entriesInPeriod = budget.entries.filter(
      (e) => e.period === modalPeriod
    );

    const income = entriesInPeriod
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const expenses = entriesInPeriod
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const savings = entriesInPeriod
      .filter((e) => e.type === 'saving')
      .reduce((sum, e) => sum + e.amount, 0);

    const currentRemaining = income - expenses - savings;

    // Simulation with current typed amount
    const inputVal = parseFloat(formAmount) || 0;
    let simulatedRemaining = currentRemaining;
    let simulatedIncome = income;
    let simulatedExpenses = expenses;
    let simulatedSavings = savings;

    if (formType === 'income') {
      simulatedIncome += inputVal;
      simulatedRemaining += inputVal;
    } else if (formType === 'expense') {
      simulatedExpenses += inputVal;
      simulatedRemaining -= inputVal;
    } else if (formType === 'saving') {
      simulatedSavings += inputVal;
      simulatedRemaining -= inputVal;
    }

    const currentUsedPct = income > 0 ? ((expenses + savings) / income) * 100 : 0;
    const simulatedUsedPct = simulatedIncome > 0 ? ((simulatedExpenses + simulatedSavings) / simulatedIncome) * 100 : 0;

    return {
      income,
      expenses,
      savings,
      currentRemaining,
      simulatedRemaining,
      simulatedIncome,
      simulatedExpenses,
      simulatedSavings,
      inputVal,
      currentUsedPct,
      simulatedUsedPct,
      hasIncome: income > 0,
    };
  }, [budget.entries, modalPeriod, formAmount, formType]);

  // Compute stats for currently active filter in the main view
  const activeViewStats = useMemo(() => {
    const isAll = selectedPeriodFilter === 'all';
    const entries = isAll
      ? budget.entries
      : budget.entries.filter((e) => e.period === selectedPeriodFilter);

    const income = entries
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const expenses = entries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const savings = entries
      .filter((e) => e.type === 'saving')
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = income - expenses - savings;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const allocationRate = income > 0 ? ((expenses + savings) / income) * 100 : 0;

    return {
      isAll,
      income,
      expenses,
      savings,
      remaining,
      savingsRate,
      allocationRate,
    };
  }, [budget.entries, selectedPeriodFilter]);

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum < 0) return;

    let periodIndex = 0;
    if (modalFrequency === 'monthly') {
      periodIndex = Math.max(0, MONTH_NAMES.indexOf(modalPeriod));
    } else {
      const idx = BIWEEKLY_PERIODS.findIndex((p) => p.id === modalPeriod);
      periodIndex = idx >= 0 ? idx : 0;
    }

    const selectedAcc = accounts.find((a) => a.id === formAccountId);

    onAddEntry({
      year: budget.year,
      date: formDate,
      period: modalPeriod,
      periodIndex,
      type: formType,
      category: formCategory,
      amount: amountNum,
      description: formDescription || formCategory,
      savingAccountId: formType === 'saving' ? formAccountId : undefined,
      savingAccountName: formType === 'saving' ? selectedAcc?.name : undefined,
    });

    setFormAmount('');
    setFormDescription('');
    setIsAddModalOpen(false);
  };

  const handleApplyPaycheckSplitter = () => {
    const total = parseFloat(splitterPaycheck) || 0;
    const rent = parseFloat(splitterRent) || 0;
    const food = parseFloat(splitterGroceries) || 0;
    const save = parseFloat(splitterSavings) || 0;
    if (total <= 0) return;

    const chosenPeriod = splitterPeriod;
    let periodIndex = 0;
    if (frequency === 'monthly') {
      periodIndex = Math.max(0, MONTH_NAMES.indexOf(chosenPeriod));
    } else {
      const idx = BIWEEKLY_PERIODS.findIndex((p) => p.id === chosenPeriod);
      periodIndex = idx >= 0 ? idx : 0;
    }

    const repDate = getRepresentativeDateForPeriod(chosenPeriod, frequency, budget.year);
    const acc = accounts.find((a) => a.id === splitterAccountId);

    // 1. Add Income
    onAddEntry({
      year: budget.year,
      date: repDate,
      period: chosenPeriod,
      periodIndex,
      type: 'income',
      category: 'Primary Salary / Paycheck',
      amount: total,
      description: `Paycheck Salary (${chosenPeriod})`,
    });

    // 2. Add Housing expense
    if (rent > 0) {
      onAddEntry({
        year: budget.year,
        date: repDate,
        period: chosenPeriod,
        periodIndex,
        type: 'expense',
        category: 'Housing & Rent',
        amount: rent,
        description: `Housing allocation from ${chosenPeriod} paycheck`,
      });
    }

    // 3. Add Groceries expense
    if (food > 0) {
      onAddEntry({
        year: budget.year,
        date: repDate,
        period: chosenPeriod,
        periodIndex,
        type: 'expense',
        category: 'Groceries & Food',
        amount: food,
        description: `Food allocation from ${chosenPeriod} paycheck`,
      });
    }

    // 4. Add Saving -> Accumulates to separate Savings Ledger!
    if (save > 0) {
      onAddEntry({
        year: budget.year,
        date: repDate,
        period: chosenPeriod,
        periodIndex,
        type: 'saving',
        category: 'Index Funds / S&P 500 Brokerage',
        amount: save,
        description: `Paycheck savings transfer (${chosenPeriod})`,
        savingAccountId: acc?.id,
        savingAccountName: acc?.name,
      });
    }

    setIsSplitterOpen(false);
  };

  // Filter entries
  const filteredEntries = budget.entries.filter((entry) => {
    if (selectedPeriodFilter !== 'all' && entry.period !== selectedPeriodFilter) {
      return false;
    }
    if (selectedTypeFilter !== 'all' && entry.type !== selectedTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = entry.category.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      if (!matchCat && !matchDesc) return false;
    }
    return true;
  });

  filteredEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const periodOptions =
    frequency === 'monthly'
      ? MONTH_NAMES
      : BIWEEKLY_PERIODS.map((p) => p.id);

  const modalPeriodOptions =
    modalFrequency === 'monthly'
      ? MONTH_NAMES
      : BIWEEKLY_PERIODS.map((p) => p.id);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

  if (viewLayout === 'spreadsheet') {
    return (
      <div className="space-y-4">
        {/* Layout Switcher Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Format:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetViewLayout('spreadsheet')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs cursor-default"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Spreadsheet Sheet (Multi-Channel &amp; ATM)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewLayout('standard')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>Standard Table &amp; HUD</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Database: capitalflow_budget_{budget.year}.json &bull; Currency: {currencySymbol}
          </div>
        </div>

        <BudgetSpreadsheetView
          budget={budget}
          accounts={accounts}
          selectedPeriod={selectedPeriodFilter === 'all' ? defaultPeriod : selectedPeriodFilter}
          onSelectPeriod={(p) => setSelectedPeriodFilter(p)}
          frequency={frequency}
          onChangeFrequency={onChangeFrequency}
          onAddEntry={onAddEntry}
          onAddMultipleEntries={onAddMultipleEntries}
          onUpdateEntry={onUpdateEntry || (() => {})}
          onDeleteEntry={onDeleteEntry}
          onUpdateCategories={onUpdateCategories}
          onUpdateTemplates={onUpdateTemplates}
          currencySymbol={currencySymbol}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout Switcher Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Format:</span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSetViewLayout('spreadsheet')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer hover:bg-white/60 dark:hover:bg-slate-700/60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Spreadsheet Sheet (Multi-Channel &amp; ATM)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewLayout('standard')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs cursor-default"
            >
              <Table className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Standard Table &amp; HUD</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          Database: capitalflow_budget_{budget.year}.json &bull; Currency: {currencySymbol}
        </div>
      </div>
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white shrink-0">
                {budget.year} Budget &amp; Data Entry
              </h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap shrink-0 leading-none">
                {frequency === 'monthly' ? 'Monthly Mode (12 Periods)' : 'Bi-Weekly Mode (26 Periods)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Record entries by period with real-time remaining salary tracking. Savings automatically accumulate in your Google Drive savings ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Frequency Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChangeFrequency('monthly');
                  setSelectedPeriodFilter(currentMonthName);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  frequency === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Monthly (12)
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeFrequency('bi-weekly');
                  setSelectedPeriodFilter(currentBiWeeklyPeriod);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  frequency === 'bi-weekly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Bi-Weekly (26)
              </button>
            </div>

            {/* Quick Paycheck Splitter */}
            <button
              onClick={() => setIsSplitterOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Split Paycheck</span>
            </button>

            {/* Manage Estimates & Categories */}
            <button
              onClick={() => setIsManagerModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Manage monthly estimated budgets and expense, income, and saving categories"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Estimates &amp; Categories</span>
            </button>

            {/* Add Transaction Button */}
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry by Period</span>
            </button>
          </div>
        </div>

        {/* Filters and Period Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
          
          {/* Period selector tabs */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Period:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto min-w-0 w-full pb-1 scrollbar-thin bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setSelectedPeriodFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedPeriodFilter === 'all'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Periods
              </button>
              {periodOptions.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriodFilter(period)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                    selectedPeriodFilter === period
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter & Search input */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
              <option value="saving">Savings Only</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none w-36 sm:w-48"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Real-Time Period Salary & Remaining Income HUD Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                {activeViewStats.isAll ? 'Full Year Financial Balance' : `Period Cashflow: ${selectedPeriodFilter}`}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeViewStats.remaining >= 0
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                }`}
              >
                {activeViewStats.remaining >= 0 ? 'Surplus Remaining' : 'Over Allocated'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mt-1 font-mono">
              {activeViewStats.remaining >= 0 ? '+' : '-'}
              {currencySymbol}{formatNumber(Math.abs(activeViewStats.remaining))}
              <span className="text-xs font-sans font-normal text-slate-300 ml-2">
                unallocated from {activeViewStats.isAll ? 'annual' : 'period'} salary/income
              </span>
            </h3>
          </div>

          <button
            onClick={() => handleOpenAddModal(selectedPeriodFilter !== 'all' ? selectedPeriodFilter : undefined)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 self-start lg:self-center cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry for {selectedPeriodFilter === 'all' ? 'Current Period' : selectedPeriodFilter}</span>
          </button>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Salary / Income</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
              +{currencySymbol}{formatNumber(activeViewStats.income)}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Living Expenses</span>
            <span className="text-base font-bold font-mono text-rose-400 mt-1 block">
              -{currencySymbol}{formatNumber(activeViewStats.expenses)}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Savings (To Ledger)</span>
            <span className="text-base font-bold font-mono text-indigo-300 mt-1 block">
              -{currencySymbol}{formatNumber(activeViewStats.savings)}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Remaining Inflow</span>
            <span
              className={`text-base font-bold font-mono mt-1 block ${
                activeViewStats.remaining >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {currencySymbol}{formatNumber(activeViewStats.remaining)}
            </span>
          </div>
        </div>

        {/* Progress meter */}
        {activeViewStats.income > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
              <span>Income Allocation: {activeViewStats.allocationRate.toFixed(1)}% utilized</span>
              <span className="font-semibold text-emerald-400">
                {Math.max(0, 100 - activeViewStats.allocationRate).toFixed(1)}% Free Cash
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (activeViewStats.expenses / activeViewStats.income) * 100)}%` }}
                title="Expenses"
              />
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (activeViewStats.savings / activeViewStats.income) * 100)}%` }}
                title="Savings"
              />
            </div>
          </div>
        )}
      </div>

      {/* Entries Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            Showing {filteredEntries.length} {filteredEntries.length === 1 ? 'record' : 'records'}{' '}
            {selectedPeriodFilter !== 'all' ? `for ${selectedPeriodFilter}` : 'across all periods'}
          </span>
          <span className="font-mono">Database: capitalflow_budget_{budget.year}.json</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No entries found for {selectedPeriodFilter === 'all' ? 'this filter' : selectedPeriodFilter}
            </p>
            <p className="text-xs mt-1 text-slate-400">
              Click &quot;New Entry by Period&quot; above to record your salary, expense, or savings for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period &amp; Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Ledger Flow</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.map((entry) => {
                  const isIncome = entry.type === 'income';
                  const isExpense = entry.type === 'expense';
                  const isSaving = entry.type === 'saving';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {entry.period}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {entry.date}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isIncome
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : isExpense
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {isIncome && <TrendingUp className="w-3 h-3" />}
                          {isExpense && <Receipt className="w-3 h-3" />}
                          {isSaving && <PiggyBank className="w-3 h-3" />}
                          <span className="capitalize">{entry.type}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {entry.category}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{entry.description}</div>
                        {isSaving && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            <ArrowRight className="w-3 h-3" />
                            <span>Accumulating into: {entry.savingAccountName || 'Savings Ledger'}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : '+'}
                          {currencySymbol}{formatNumber(entry.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD ENTRY BY PERIOD WITH LIVE REMAINING SALARY COMPUTATION */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Record Entry by Period</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {modalPeriod} ({budget.year})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your cycle to see remaining salary and live cash flow balance.
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              
              {/* 1. Period Selector (Monthly vs Bi-Weekly) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Target Period</span>
                  </label>

                  <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setModalFrequency('monthly');
                        const m = MONTH_NAMES[new Date().getMonth()];
                        handleModalPeriodChange(m);
                      }}
                      className={`px-2 py-0.5 rounded-md ${
                        modalFrequency === 'monthly'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalFrequency('bi-weekly');
                        handleModalPeriodChange(currentBiWeeklyPeriod);
                      }}
                      className={`px-2 py-0.5 rounded-md ${
                        modalFrequency === 'bi-weekly'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      Bi-Weekly
                    </button>
                  </div>
                </div>

                {/* Period Grid/Dropdown */}
                <div>
                  <select
                    value={modalPeriod}
                    onChange={(e) => handleModalPeriodChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    {modalPeriodOptions.map((period) => (
                      <option key={period} value={period}>
                        {modalFrequency === 'monthly'
                          ? `Month of ${period} ${budget.year}`
                          : `${period} (Bi-Weekly Period)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. REAL-TIME REMAINING SALARY & CASH FLOW HUD */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span>Period Income &amp; Salary Balance ({modalPeriod})</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      periodStats.simulatedRemaining >= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {periodStats.simulatedRemaining >= 0 ? 'Within Budget' : 'Over Income!'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Total Income</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {currencySymbol}{formatNumber(periodStats.income)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Committed</span>
                    <span className="font-mono font-bold text-rose-400 text-xs">
                      {currencySymbol}{formatNumber(periodStats.expenses + periodStats.savings)}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Current Remaining</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        periodStats.currentRemaining >= 0 ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      {currencySymbol}{formatNumber(periodStats.currentRemaining)}
                    </span>
                  </div>
                </div>

                {/* Simulated Live Remaining Status */}
                {periodStats.inputVal > 0 && (
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between text-xs animate-in fade-in">
                    <div>
                      <span className="text-slate-300 block text-[11px]">
                        Remaining after this {formType}:
                      </span>
                      <span
                        className={`text-base font-mono font-bold ${
                          periodStats.simulatedRemaining >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {periodStats.simulatedRemaining >= 0 ? '+' : '-'}
                        {currencySymbol}{formatNumber(Math.abs(periodStats.simulatedRemaining))}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-300">
                      <div>
                        {periodStats.simulatedRemaining >= 0 ? (
                          <span className="text-emerald-300 font-semibold flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Affordable</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold flex items-center gap-1 justify-end">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Exceeds Period Income</span>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {periodStats.simulatedUsedPct.toFixed(1)}% of income allocated
                      </span>
                    </div>
                  </div>
                )}

                {!periodStats.hasIncome && formType !== 'income' && (
                  <div className="p-2.5 bg-amber-950/60 text-amber-200 rounded-xl border border-amber-800/60 flex items-start gap-2 text-[11px]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      No salary or income has been recorded for {modalPeriod} yet. You can still record this entry, but your period balance will be negative until income is logged.
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Form Details */}
              <form onSubmit={handleCreateEntry} className="space-y-4">
                {/* Entry Type */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1.5">
                    Entry Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('expense');
                        setFormCategory(expenseCategories[0] || 'Budget');
                        setSelectedTemplateId('');
                      }}
                      className={`py-2 px-3 rounded-xl font-semibold border text-center transition-all ${
                        formType === 'expense'
                          ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 text-rose-700 dark:text-rose-300 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('income');
                        setFormCategory(incomeCategories[0] || 'Salary');
                        setSelectedTemplateId('');
                      }}
                      className={`py-2 px-3 rounded-xl font-semibold border text-center transition-all ${
                        formType === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Income / Salary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('saving');
                        setFormCategory(savingCategories[0] || 'Savings');
                        setSelectedTemplateId('');
                      }}
                      className={`py-2 px-3 rounded-xl font-semibold border text-center transition-all ${
                        formType === 'saving'
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Saving (To Ledger)
                    </button>
                  </div>
                </div>

                {/* Pre-populate from Estimated Budget Templates */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pre-Populate from Estimated Budget</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManagerModalOpen(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Manage Templates
                    </button>
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      setSelectedTemplateId(tplId);
                      const tpl = itemTemplates.find((t) => t.id === tplId);
                      if (tpl) {
                        setFormType(tpl.type);
                        setFormCategory(tpl.category);
                        setFormAmount(String(tpl.defaultEstimatedCost || ''));
                        setFormDescription(tpl.item);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">⚡ Select an Item to Pre-Populate...</option>
                    {itemTemplates
                      .filter((t) => t.type === formType)
                      .map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.item} ({tpl.category}) — Est: {currencySymbol}{formatNumber(tpl.defaultEstimatedCost)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount & Date in Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Amount ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Date in {modalPeriod}
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManagerModalOpen(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      + Manage Categories
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {(formType === 'income'
                      ? incomeCategories
                      : formType === 'expense'
                      ? expenseCategories
                      : savingCategories
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Saving: Select Destination Account for Ledger */}
                {formType === 'saving' && (
                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                      <PiggyBank className="w-4 h-4" />
                      <span>Accumulate into Savings Ledger Account</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Credited automatically into your separate Google Drive savings ledger file (<code className="font-mono text-indigo-600 dark:text-indigo-400">capitalflow_savings_ledger.json</code>).
                    </p>
                    <select
                      value={formAccountId}
                      onChange={(e) => setFormAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-lg text-slate-900 dark:text-white outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Description / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Electric bill, Bi-weekly salary deposit, Emergency fund allocation"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Record for {modalPeriod}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYCHECK SPLITTER */}
      {isSplitterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-lg">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Quick Paycheck Allocator
                  </h3>
                </div>
                <button
                  onClick={() => setIsSplitterOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Split your periodic paycheck into living expenses and automated savings in a single step.
                </p>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Select Paycheck Period
                  </label>
                  <select
                    value={splitterPeriod}
                    onChange={(e) => setSplitterPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {periodOptions.map((period) => (
                      <option key={period} value={period}>
                        {frequency === 'monthly' ? `Month of ${period}` : period}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Total Paycheck Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={splitterPaycheck}
                    onChange={(e) => setSplitterPaycheck(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-base font-bold text-emerald-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Housing / Rent ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={splitterRent}
                      onChange={(e) => setSplitterRent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Groceries &amp; Food ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={splitterGroceries}
                      onChange={(e) => setSplitterGroceries(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-indigo-700 dark:text-indigo-300 font-semibold">
                      Savings Allocation ({currencySymbol})
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Accumulates to Ledger
                    </span>
                  </div>
                  <input
                    type="number"
                    value={splitterSavings}
                    onChange={(e) => setSplitterSavings(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 rounded-lg font-mono text-sm font-bold text-indigo-600 outline-none"
                  />
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Target Account</label>
                    <select
                      value={splitterAccountId}
                      onChange={(e) => setSplitterAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 rounded-lg text-xs"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remaining unallocated from paycheck preview */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Remaining from this paycheck:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {currencySymbol}
                    {formatNumber(
                      Math.max(
                        0,
                        (parseFloat(splitterPaycheck) || 0) -
                          (parseFloat(splitterRent) || 0) -
                          (parseFloat(splitterGroceries) || 0) -
                          (parseFloat(splitterSavings) || 0)
                      )
                    )}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSplitterOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPaycheckSplitter}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Allocate &amp; Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category & Estimated Budget Template Manager Modal */}
      <CategoryAndTemplateManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        budget={budget}
        onUpdateCategories={onUpdateCategories}
        onUpdateTemplates={onUpdateTemplates}
        currencySymbol={currencySymbol}
      />

    </div>
  );
};
