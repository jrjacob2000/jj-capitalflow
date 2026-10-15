import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Calendar,
  PiggyBank,
  TrendingUp,
  Receipt,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Banknote,
  CreditCard,
  Building,
  Smartphone,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Tag,
  Check,
} from 'lucide-react';
import {
  BudgetEntry,
  YearBudgetData,
  EntryFrequency,
  PaymentMethod,
  SavingsAccount,
  BudgetItemTemplate,
} from '../types/finance';
import {
  MONTH_NAMES,
  BIWEEKLY_PERIODS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVING_CATEGORIES,
  PAYMENT_METHODS,
  DEFAULT_ITEM_TEMPLATES,
} from '../services/sampleData';
import { CategoryAndTemplateManagerModal } from './CategoryAndTemplateManagerModal';

export interface SheetRowItem {
  id: string;
  isVirtualEstimate: boolean;
  templateId?: string;
  type: 'income' | 'expense' | 'saving';
  category: string;
  item: string;
  estimatedCost: number;
  actualCost: number;
  hasActualCost: boolean;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: BudgetEntry['paymentBreakdown'];
  difference: number;
  status: 'Paid' | 'Pending' | 'Scheduled' | 'Estimated';
  reference?: string;
  date: string;
  toBeWithdrawn: boolean;
  savingAccountId?: string;
  savingAccountName?: string;
}

interface BudgetSpreadsheetViewProps {
  budget: YearBudgetData;
  accounts: SavingsAccount[];
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  frequency: EntryFrequency;
  onChangeFrequency: (freq: EntryFrequency) => void;
  onAddEntry: (entry: Omit<BudgetEntry, 'id' | 'createdAt'>) => void;
  onAddMultipleEntries?: (entries: Omit<BudgetEntry, 'id' | 'createdAt'>[]) => void;
  onUpdateEntry: (id: string, updated: Partial<BudgetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateCategories: (customCats: {
    expense: string[];
    income: string[];
    saving: string[];
  }) => void;
  onUpdateTemplates: (templates: BudgetItemTemplate[]) => void;
  currencySymbol?: string;
}

export const BudgetSpreadsheetView: React.FC<BudgetSpreadsheetViewProps> = ({
  budget,
  accounts,
  selectedPeriod,
  onSelectPeriod,
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
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [modalPeriod, setModalPeriod] = useState<string>(selectedPeriod);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'saving'>('expense');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Active Categories & Templates (from budget or defaults)
  const expenseCategories = budget.customCategories?.expense || [...EXPENSE_CATEGORIES];
  const incomeCategories = budget.customCategories?.income || [...INCOME_CATEGORIES];
  const savingCategories = budget.customCategories?.saving || [...SAVING_CATEGORIES];
  const itemTemplates: BudgetItemTemplate[] = budget.itemTemplates || [...DEFAULT_ITEM_TEMPLATES];

  // Helper to find estimated cost for any item name or category
  const getEstimateForItem = (itemName: string, catName?: string, type?: 'income' | 'expense' | 'saving'): number => {
    const trimmed = itemName.trim().toLowerCase();
    if (!trimmed) {
      if (catName) {
        const catMatch = itemTemplates.find((t) => t.category.toLowerCase() === catName.toLowerCase());
        if (catMatch && catMatch.defaultEstimatedCost > 0) return catMatch.defaultEstimatedCost;
      }
      return 0;
    }
    const exact = itemTemplates.find((t) => t.item.toLowerCase() === trimmed);
    if (exact && exact.defaultEstimatedCost > 0) {
      return exact.defaultEstimatedCost;
    }
    const partial = itemTemplates.find(
      (t) => t.item.toLowerCase().includes(trimmed) || trimmed.includes(t.item.toLowerCase())
    );
    if (partial && partial.defaultEstimatedCost > 0) {
      return partial.defaultEstimatedCost;
    }
    if (catName) {
      const catMatch = itemTemplates.find((t) => t.category.toLowerCase() === catName.toLowerCase());
      if (catMatch && catMatch.defaultEstimatedCost > 0) return catMatch.defaultEstimatedCost;
    }
    return 0;
  };

  // Form states - initialized with estimates pre-populated
  const [formCategory, setFormCategory] = useState<string>(expenseCategories[0] || 'Budget');
  const [formItem, setFormItem] = useState<string>('');
  const [formEstimated, setFormEstimated] = useState<string>('');
  const [formActual, setFormActual] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [formStatus, setFormStatus] = useState<'Paid' | 'Pending' | 'Scheduled'>('Paid');
  const [formReference, setFormReference] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0].replace(/^\d{4}/, String(budget.year))
  );
  const [formToBeWithdrawn, setFormToBeWithdrawn] = useState<boolean>(false);
  const [formSavingAccountId, setFormSavingAccountId] = useState<string>(accounts[0]?.id || '');



  // Period lists
  const periodList =
    frequency === 'monthly' ? MONTH_NAMES : BIWEEKLY_PERIODS.map((p) => p.id);

  // UNIFIED SHEET ROWS: THE SHEET IS ALREADY PRE-POPULATED WITH ALL ESTIMATES!
  const { unifiedIncomeRows, unifiedExpenseRows } = useMemo(() => {
    const recordedEntries = budget.entries.filter((e) => e.period === selectedPeriod);
    const recordedMap = new Map<string, BudgetEntry>();
    const usedEntryIds = new Set<string>();

    recordedEntries.forEach((e) => {
      const key = (e.item || e.description || '').toLowerCase().trim();
      if (!recordedMap.has(key)) {
        recordedMap.set(key, e);
      }
    });

    const incomeRows: SheetRowItem[] = [];
    const expenseRows: SheetRowItem[] = [];

    // 1. Every template is guaranteed to appear on the sheet PRE-POPULATED with its estimate!
    itemTemplates.forEach((tpl) => {
      const key = tpl.item.toLowerCase().trim();
      const matchedEntry = recordedMap.get(key);

      if (matchedEntry) {
        usedEntryIds.add(matchedEntry.id);
        const est =
          matchedEntry.estimatedCost !== undefined && matchedEntry.estimatedCost > 0
            ? matchedEntry.estimatedCost
            : tpl.defaultEstimatedCost;
        const act = matchedEntry.actualCost !== undefined ? matchedEntry.actualCost : matchedEntry.amount;
        const diff = tpl.type === 'income' ? act - est : est - act;

        const row: SheetRowItem = {
          id: matchedEntry.id,
          isVirtualEstimate: false,
          templateId: tpl.id,
          type: matchedEntry.type,
          category: matchedEntry.category || tpl.category,
          item: matchedEntry.item || tpl.item,
          estimatedCost: est,
          actualCost: act,
          hasActualCost: true,
          paymentMethod: matchedEntry.paymentMethod || tpl.defaultPaymentMethod || 'Bank Transfer',
          paymentBreakdown: matchedEntry.paymentBreakdown,
          difference: diff,
          status: matchedEntry.status || 'Paid',
          reference: matchedEntry.reference,
          date: matchedEntry.date,
          toBeWithdrawn: Boolean(matchedEntry.toBeWithdrawn || tpl.toBeWithdrawn),
          savingAccountId: matchedEntry.savingAccountId,
          savingAccountName: matchedEntry.savingAccountName,
        };

        if (tpl.type === 'income') {
          incomeRows.push(row);
        } else {
          expenseRows.push(row);
        }
      } else {
        // Not yet recorded: Sheet is already pre-populated with the estimate!
        const est = tpl.defaultEstimatedCost || 0;
        const repDate = new Date().toISOString().split('T')[0].replace(/^\d{4}/, String(budget.year));

        const row: SheetRowItem = {
          id: `virtual-${tpl.id}-${selectedPeriod}`,
          isVirtualEstimate: true,
          templateId: tpl.id,
          type: tpl.type,
          category: tpl.category,
          item: tpl.item,
          estimatedCost: est,
          actualCost: 0,
          hasActualCost: false,
          paymentMethod: tpl.defaultPaymentMethod || 'Bank Transfer',
          difference: tpl.type === 'income' ? -est : est,
          status: 'Estimated',
          reference: 'Pre-populated estimate',
          date: repDate,
          toBeWithdrawn: Boolean(tpl.toBeWithdrawn),
        };

        if (tpl.type === 'income') {
          incomeRows.push(row);
        } else {
          expenseRows.push(row);
        }
      }
    });

    // 2. Add any custom recorded entries that are not in the template list
    recordedEntries.forEach((entry) => {
      if (!usedEntryIds.has(entry.id)) {
        const est = entry.estimatedCost ?? 0;
        const act = entry.actualCost ?? entry.amount ?? 0;
        const diff = entry.type === 'income' ? act - est : est - act;

        const row: SheetRowItem = {
          id: entry.id,
          isVirtualEstimate: false,
          type: entry.type,
          category: entry.category,
          item: entry.item || entry.description,
          estimatedCost: est,
          actualCost: act,
          hasActualCost: true,
          paymentMethod: entry.paymentMethod || 'Bank Transfer',
          paymentBreakdown: entry.paymentBreakdown,
          difference: diff,
          status: entry.status || 'Paid',
          reference: entry.reference,
          date: entry.date,
          toBeWithdrawn: Boolean(entry.toBeWithdrawn),
          savingAccountId: entry.savingAccountId,
          savingAccountName: entry.savingAccountName,
        };

        if (entry.type === 'income') {
          incomeRows.push(row);
        } else {
          expenseRows.push(row);
        }
      }
    });

    return { unifiedIncomeRows: incomeRows, unifiedExpenseRows: expenseRows };
  }, [budget.entries, itemTemplates, selectedPeriod, budget.year]);

  // Totals calculations across the pre-populated sheet
  const totalIncomeEstimated = unifiedIncomeRows.reduce(
    (sum, r) => sum + r.estimatedCost,
    0
  );
  const totalIncomeActual = unifiedIncomeRows.reduce(
    (sum, r) => sum + (r.hasActualCost ? r.actualCost : 0),
    0
  );
  const incomeDifference = totalIncomeActual - totalIncomeEstimated;

  const totalExpenseEstimated = unifiedExpenseRows.reduce(
    (sum, r) => sum + r.estimatedCost,
    0
  );
  const totalExpenseActual = unifiedExpenseRows.reduce(
    (sum, r) => sum + (r.hasActualCost ? r.actualCost : 0),
    0
  );
  const expenseDifference = totalExpenseEstimated - totalExpenseActual;

  // Extra / Remaining Salary
  const remainingExtra = totalIncomeActual - totalExpenseActual;
  const remainingExtraEstimated = totalIncomeEstimated - totalExpenseEstimated;

  // Helpers
  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(num);

  const getMethodAmount = (entry: SheetRowItem, method: PaymentMethod): number => {
    if (!entry.hasActualCost) return 0;
    if (entry.paymentBreakdown) {
      switch (method) {
        case 'Stay in ATM':
          return entry.paymentBreakdown.stayInAtm || 0;
        case 'Cash':
          return entry.paymentBreakdown.cash || 0;
        case 'Credit Card':
          return entry.paymentBreakdown.creditCard || 0;
        case 'GCash Transfer':
          return entry.paymentBreakdown.gcashTransfer || 0;
        case 'Kath Account':
          return entry.paymentBreakdown.kathAccount || 0;
        case 'Checking Account':
          return entry.paymentBreakdown.checkAccount || 0;
        case 'Bank Transfer':
          return entry.paymentBreakdown.bankTransfer || 0;
        default:
          return 0;
      }
    }
    return entry.paymentMethod === method ? entry.actualCost : 0;
  };

  // Breakdown by payment methods for rows with actuals recorded
  const paymentTotals = useMemo(() => {
    const totals: { [key in PaymentMethod]?: number } = {
      'Stay in ATM': 0,
      Cash: 0,
      'Credit Card': 0,
      'GCash Transfer': 0,
      'Kath Account': 0,
      'Checking Account': 0,
      'Bank Transfer': 0,
      Other: 0,
    };

    unifiedExpenseRows.forEach((e) => {
      if (e.hasActualCost) {
        if (e.paymentBreakdown) {
          totals['Stay in ATM'] = (totals['Stay in ATM'] || 0) + (e.paymentBreakdown.stayInAtm || 0);
          totals.Cash = (totals.Cash || 0) + (e.paymentBreakdown.cash || 0);
          totals['Credit Card'] = (totals['Credit Card'] || 0) + (e.paymentBreakdown.creditCard || 0);
          totals['GCash Transfer'] =
            (totals['GCash Transfer'] || 0) + (e.paymentBreakdown.gcashTransfer || 0);
          totals['Kath Account'] =
            (totals['Kath Account'] || 0) + (e.paymentBreakdown.kathAccount || 0);
          totals['Checking Account'] =
            (totals['Checking Account'] || 0) + (e.paymentBreakdown.checkAccount || 0);
          totals['Bank Transfer'] =
            (totals['Bank Transfer'] || 0) + (e.paymentBreakdown.bankTransfer || 0);
        } else {
          const method = e.paymentMethod || 'Bank Transfer';
          totals[method] = (totals[method] || 0) + e.actualCost;
        }
      }
    });

    return totals;
  }, [unifiedExpenseRows]);



  // Real-time calculations for the modal's selected period
  const modalPeriodStats = useMemo(() => {
    const entriesInModalPeriod = budget.entries.filter((e) => e.period === modalPeriod);
    const incAct = entriesInModalPeriod
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + (e.actualCost ?? e.amount ?? 0), 0);
    const incEst = itemTemplates
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.defaultEstimatedCost, 0);

    const expAct = entriesInModalPeriod
      .filter((e) => e.type === 'expense' || e.type === 'saving')
      .reduce((sum, e) => sum + (e.actualCost ?? e.amount ?? 0), 0);
    const expEst = itemTemplates
      .filter((t) => t.type === 'expense' || t.type === 'saving')
      .reduce((sum, t) => sum + t.defaultEstimatedCost, 0);

    const currRemaining = (incAct > 0 ? incAct : incEst) - expAct;
    const actInput = parseFloat(formActual) || parseFloat(formEstimated) || 0;

    let origAct = 0;
    if (editingEntryId) {
      const orig = budget.entries.find((e) => e.id === editingEntryId);
      if (orig && orig.period === modalPeriod) {
        origAct = orig.actualCost ?? orig.amount ?? 0;
      }
    }

    let projectedIncome = incAct > 0 ? incAct : incEst;
    let projectedExpense = expAct;

    if (modalType === 'income') {
      projectedIncome = incAct - origAct + actInput;
    } else {
      projectedExpense = expAct - origAct + actInput;
    }

    const projectedRemaining = projectedIncome - projectedExpense;
    const usedPercentage = projectedIncome > 0 ? (projectedExpense / projectedIncome) * 100 : 0;

    return {
      incAct,
      incEst,
      expAct,
      expEst,
      currRemaining,
      projectedIncome,
      projectedExpense,
      projectedRemaining,
      usedPercentage,
    };
  }, [
    budget.entries,
    itemTemplates,
    modalPeriod,
    formActual,
    formEstimated,
    modalType,
    editingEntryId,
  ]);

  // Open modal for clicking ANY row on the sheet (virtual estimate or recorded)
  // THE ESTIMATE TEXT IS ALREADY POPULATED!
  const handleOpenRow = (row: SheetRowItem) => {
    setModalPeriod(selectedPeriod);
    setModalType(row.type);
    setFormCategory(row.category);
    setFormItem(row.item);

    // In entry modal the estimate text should already populated if it has an estimate amount
    const est = row.estimatedCost || getEstimateForItem(row.item, row.category, row.type);
    setFormEstimated(est > 0 ? String(est) : '');

    if (row.hasActualCost && !row.isVirtualEstimate) {
      setEditingEntryId(row.id);
      setFormActual(String(row.actualCost));
      setFormStatus(row.status === 'Estimated' ? 'Paid' : (row.status as any));
      setFormReference(row.reference || '');
    } else {
      setEditingEntryId(null);
      // Actual is ready for input, pre-filling with estimated cost for instant confirmation or adjustment
      setFormActual(est > 0 ? String(est) : '');
      setFormStatus('Paid');
      setFormReference('');
    }

    setFormPaymentMethod(row.paymentMethod || 'Bank Transfer');
    setFormToBeWithdrawn(Boolean(row.toBeWithdrawn));
    setFormSavingAccountId(row.savingAccountId || accounts[0]?.id || '');
    setSelectedTemplateId(row.templateId || '');
    setIsAddModalOpen(true);
  };

  // Open modal for new entry button (+ Income, + Expense, + Saving)
  // THE ESTIMATE TEXT IS ALREADY POPULATED!
  const handleOpenAdd = (type: 'income' | 'expense' | 'saving') => {
    setEditingEntryId(null);
    setModalPeriod(selectedPeriod);
    setModalType(type);

    const firstTpl = itemTemplates.find((t) => t.type === type);
    if (firstTpl) {
      setSelectedTemplateId(firstTpl.id);
      setFormCategory(firstTpl.category);
      setFormItem(firstTpl.item);
      // Pre-populate estimate text!
      setFormEstimated(String(firstTpl.defaultEstimatedCost || ''));
      setFormActual(firstTpl.defaultEstimatedCost > 0 ? String(firstTpl.defaultEstimatedCost) : '');
      if (firstTpl.defaultPaymentMethod) {
        setFormPaymentMethod(firstTpl.defaultPaymentMethod);
      }
      setFormToBeWithdrawn(Boolean(firstTpl.toBeWithdrawn));
    } else {
      setSelectedTemplateId('');
      setFormCategory(
        type === 'income'
          ? incomeCategories[0] || 'Salary'
          : type === 'saving'
          ? savingCategories[0] || 'Savings'
          : expenseCategories[0] || 'Budget'
      );
      setFormItem('');
      setFormEstimated('');
      setFormActual('');
      setFormPaymentMethod('Bank Transfer');
      setFormToBeWithdrawn(false);
    }

    setFormStatus('Paid');
    setFormReference('');
    setIsAddModalOpen(true);
  };

  // When template is selected in modal:
  // THE ESTIMATE TEXT IS ALREADY POPULATED!
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = itemTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    setModalType(tpl.type);
    setFormCategory(tpl.category);
    setFormItem(tpl.item);
    // In entry modal the estimate text should already populated if it has an estimate amount
    setFormEstimated(String(tpl.defaultEstimatedCost || ''));
    setFormActual(String(tpl.defaultEstimatedCost || ''));
    if (tpl.defaultPaymentMethod) {
      setFormPaymentMethod(tpl.defaultPaymentMethod);
    }
    setFormToBeWithdrawn(Boolean(tpl.toBeWithdrawn));
  };

  // When user types or selects a line item: auto-populate estimate if matching
  const handleItemChange = (newItemName: string) => {
    setFormItem(newItemName);
    const est = getEstimateForItem(newItemName, formCategory, modalType);
    if (est > 0) {
      setFormEstimated(String(est));
      if (!formActual) {
        setFormActual(String(est));
      }
    }
    const tpl = itemTemplates.find(
      (t) => t.item.toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (tpl) {
      setFormCategory(tpl.category);
      if (tpl.defaultPaymentMethod) setFormPaymentMethod(tpl.defaultPaymentMethod);
      if (tpl.toBeWithdrawn !== undefined) setFormToBeWithdrawn(Boolean(tpl.toBeWithdrawn));
      setSelectedTemplateId(tpl.id);
    }
  };

  // When user changes category: update estimate if applicable
  const handleCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    const est = getEstimateForItem(formItem, newCat, modalType);
    if (est > 0 && (!formEstimated || formEstimated === '0')) {
      setFormEstimated(String(est));
      if (!formActual) setFormActual(String(est));
    }
  };

  // Submit modal entry
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const estNum = parseFloat(formEstimated) || 0;
    const actNum = parseFloat(formActual) || estNum;
    const diff = modalType === 'income' ? actNum - estNum : estNum - actNum;

    let periodIndex = 0;
    if (frequency === 'monthly') {
      periodIndex = Math.max(0, MONTH_NAMES.indexOf(modalPeriod));
    } else {
      const match = modalPeriod.match(/\d+/);
      periodIndex = match ? parseInt(match[0], 10) - 1 : 0;
    }

    const selectedAcc = accounts.find((a) => a.id === formSavingAccountId);

    const entryPayload = {
      year: budget.year,
      period: modalPeriod,
      periodIndex,
      date: formDate,
      type: modalType,
      category: formCategory,
      item: formItem.trim() || formCategory,
      estimatedCost: estNum,
      actualCost: actNum,
      amount: actNum,
      paymentMethod: formPaymentMethod,
      difference: diff,
      status: formStatus,
      reference: formReference.trim(),
      toBeWithdrawn: formToBeWithdrawn,
      description: formItem.trim() || formCategory,
      savingAccountId: modalType === 'saving' ? formSavingAccountId : undefined,
      savingAccountName: modalType === 'saving' ? selectedAcc?.name : undefined,
    };

    if (editingEntryId) {
      onUpdateEntry(editingEntryId, entryPayload);
    } else {
      // Check if an existing entry already matches in this period
      const existingMatch = budget.entries.find(
        (entry) =>
          entry.period === modalPeriod &&
          (entry.item || entry.description || '').toLowerCase().trim() ===
            (formItem.trim() || formCategory).toLowerCase().trim()
      );
      if (existingMatch) {
        onUpdateEntry(existingMatch.id, entryPayload);
      } else {
        onAddEntry(entryPayload);
      }
    }

    setIsAddModalOpen(false);
  };

  // Export current period as CSV
  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push(`,,${frequency === 'monthly' ? 'Monthly' : 'Bi-Weekly'},,,,,,,,,,,,,,,,,,,`);
    lines.push(`,,Period,"${selectedPeriod}, ${budget.year}",,,,,,,,,,,,,,,,,,`);
    lines.push(',,,,,,,,,,,,,,,,,,,,,');
    lines.push(',,Income,,,,,,,,,,,,,,,,,,,');
    lines.push(',,,Estimated,Actual,,,,,,,,Difference,,,,,,,,,');

    unifiedIncomeRows.forEach((inc) => {
      const est = inc.estimatedCost || 0;
      const act = inc.actualCost || 0;
      const diff = act - est;
      lines.push(
        `,,${inc.item},"${currencySymbol}${formatNumber(est)}","${currencySymbol}${formatNumber(act)}",,,,,,,,"${currencySymbol}${formatNumber(diff)}",,,,,,,,,`
      );
    });

    lines.push(
      `,,Total Income,"${currencySymbol}${formatNumber(totalIncomeEstimated)}","${currencySymbol}${formatNumber(totalIncomeActual)}",,,,,,,,"${currencySymbol}${formatNumber(incomeDifference)}",,,,,,,,,`
    );
    lines.push(',,,,,,,,,,,,,,,,,,,,,');
    lines.push(',,Monthly Expenses,,,,,,,,,,,,,,,,,,,');
    lines.push(
      ',Category,Item,,Actual Cost,,,,,,,,Difference,Status,Reference,Date,,,,,,'
    );
    lines.push(
      ',,,Estimated Cost,Actual Cost,Stay in ATM,Cash,Credit Card,GCash Transfer,Kath Account,Check Account,Bank Transfer,,,,,,,,,,'
    );

    unifiedExpenseRows.forEach((exp) => {
      const est = exp.estimatedCost || 0;
      const act = exp.actualCost || 0;
      const atm = getMethodAmount(exp, 'Stay in ATM');
      const cash = getMethodAmount(exp, 'Cash');
      const cc = getMethodAmount(exp, 'Credit Card');
      const gcash = getMethodAmount(exp, 'GCash Transfer');
      const kath = getMethodAmount(exp, 'Kath Account');
      const chk = getMethodAmount(exp, 'Checking Account');
      const bank = getMethodAmount(exp, 'Bank Transfer');
      const diff = est - act;

      lines.push(
        `,${exp.category},${exp.item},"${currencySymbol}${formatNumber(est)}","${currencySymbol}${formatNumber(act)}",${atm ? `"${currencySymbol}${formatNumber(atm)}"` : ''},${cash ? `"${currencySymbol}${formatNumber(cash)}"` : ''},${cc ? `"${currencySymbol}${formatNumber(cc)}"` : ''},${gcash ? `"${currencySymbol}${formatNumber(gcash)}"` : ''},${kath ? `"${currencySymbol}${formatNumber(kath)}"` : ''},${chk ? `"${currencySymbol}${formatNumber(chk)}"` : ''},${bank ? `"${currencySymbol}${formatNumber(bank)}"` : ''},"${currencySymbol}${formatNumber(diff)}",${exp.status || 'Paid'},${exp.reference || ''},${exp.date},,,,,,`
      );
    });

    lines.push(',,Expenses Total Summary,,,,,,,,,,,,,,,,,,,');
    lines.push(
      `,,Total Expense,"${currencySymbol}${formatNumber(totalExpenseEstimated)}","${currencySymbol}${formatNumber(totalExpenseActual)}","${currencySymbol}${formatNumber(paymentTotals['Stay in ATM'] || 0)}","${currencySymbol}${formatNumber(paymentTotals.Cash || 0)}","${currencySymbol}${formatNumber(paymentTotals['Credit Card'] || 0)}","${currencySymbol}${formatNumber(paymentTotals['GCash Transfer'] || 0)}","${currencySymbol}${formatNumber(paymentTotals['Kath Account'] || 0)}","${currencySymbol}${formatNumber(paymentTotals['Checking Account'] || 0)}","${currencySymbol}${formatNumber(paymentTotals['Bank Transfer'] || 0)}","${currencySymbol}${formatNumber(expenseDifference)}",,,,,,,,,`
    );
    lines.push(
      `,,Income,,"${currencySymbol}${formatNumber(totalIncomeActual)}",,,,,,,,,,,,,,,,,`
    );
    lines.push(
      `,,Extra / Remaining Salary,,"${currencySymbol}${formatNumber(remainingExtra)}",,,,,,,,,,,,,,,,,`
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Budget_${selectedPeriod}_${budget.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white shrink-0">
                  Period Ledger &amp; Cash Flow Sheet
                </h2>
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap shrink-0 leading-none">
                  {selectedPeriod} ({budget.year})
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold whitespace-nowrap shrink-0 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Pre-populated with Estimates
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                All monthly estimates are pre-populated on the sheet. Click any line item to record the actual amount.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto max-w-[280px] sm:max-w-none scrollbar-none">
              {periodList.map((p) => (
                <button
                  key={p}
                  onClick={() => onSelectPeriod(p)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                    selectedPeriod === p
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <button
              onClick={() => handleOpenAdd('income')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Income</span>
            </button>

            <button
              onClick={() => handleOpenAdd('expense')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Expense</span>
            </button>

            <button
              onClick={() => handleOpenAdd('saving')}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Add saving entry to accumulate in separate savings ledger"
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>+ Saving</span>
            </button>

            {/* Manage Estimates & Categories Button */}
            <button
              onClick={() => setIsManagerModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Manage monthly estimated budgets and expense, income, and saving categories"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Estimates &amp; Categories</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Download CSV formatted exactly like your spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* TOP 3-CARD PERIOD SUMMARY: REMAINING SALARY & TOTALS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: SALARY & INCOME */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Salary &amp; Income ({selectedPeriod})</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {currencySymbol}{formatNumber(totalIncomeActual > 0 ? totalIncomeActual : totalIncomeEstimated)}
            {totalIncomeActual === 0 && <span className="text-xs text-slate-400 ml-1 font-normal">(Est)</span>}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Pre-populated Est: {currencySymbol}{formatNumber(totalIncomeEstimated)}</span>
            <span className={incomeDifference >= 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-semibold'}>
              Actual: {currencySymbol}{formatNumber(totalIncomeActual)}
            </span>
          </div>
        </div>

        {/* CARD 2: TOTAL EXPENSES & SAVINGS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Outflow &amp; Savings</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {currencySymbol}{formatNumber(totalExpenseActual > 0 ? totalExpenseActual : totalExpenseEstimated)}
            {totalExpenseActual === 0 && <span className="text-xs text-slate-400 ml-1 font-normal">(Est)</span>}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Pre-populated Est: {currencySymbol}{formatNumber(totalExpenseEstimated)}</span>
            <span className={totalExpenseActual > 0 ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400'}>
              Actual: {currencySymbol}{formatNumber(totalExpenseActual)}
            </span>
          </div>
        </div>

        {/* CARD 3: REMAINING TO SALARY */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
            <span className="font-bold uppercase tracking-wider">Remaining to Salary ({selectedPeriod})</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-xl font-black font-mono">
            {currencySymbol}{formatNumber(totalIncomeActual > 0 ? remainingExtra : remainingExtraEstimated)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100 mt-1 font-medium">
            <span>Est Remaining: {currencySymbol}{formatNumber(remainingExtraEstimated)}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
              {(totalIncomeActual > 0 ? remainingExtra : remainingExtraEstimated) >= 0 ? 'Safe Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

      </div>

      {/* SPREADSHEET MAIN CONTAINER */}
      <div className="space-y-6">
          
          {/* 1. INCOME TABLE - PRE-POPULATED ESTIMATES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Income Sources ({selectedPeriod})
                </span>
                <span className="text-[10px] text-slate-500 font-mono bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {unifiedIncomeRows.length} pre-populated items
                </span>
              </div>
              <button
                onClick={() => handleOpenAdd('income')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Custom Income</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Income Source</th>
                    <th className="py-2.5 px-4 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                      Estimated (Pre-populated)
                    </th>
                    <th className="py-2.5 px-4 text-right">Actual Recorded</th>
                    <th className="py-2.5 px-4 text-right">Difference</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unifiedIncomeRows.map((inc) => {
                    const est = inc.estimatedCost;
                    const act = inc.actualCost;
                    const diff = inc.hasActualCost ? act - est : 0;

                    return (
                      <tr
                        key={inc.id}
                        onClick={() => handleOpenRow(inc)}
                        className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{inc.item}</span>
                          {inc.isVirtualEstimate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                              Estimated
                            </span>
                          )}
                        </td>
                        {/* PRE-POPULATED ESTIMATE COLUMN */}
                        <td className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200 bg-emerald-50/20 dark:bg-emerald-950/10">
                          {currencySymbol}{formatNumber(est)}
                        </td>
                        {/* ACTUAL COLUMN */}
                        <td className="py-2.5 px-4 text-right">
                          {inc.hasActualCost ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {currencySymbol}{formatNumber(act)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px] group-hover:text-emerald-600 font-medium transition-colors">
                              + Record actual
                            </span>
                          )}
                        </td>
                        {/* DIFFERENCE */}
                        <td className="py-2.5 px-4 text-right">
                          {inc.hasActualCost ? (
                            <span
                              className={
                                diff < 0
                                  ? 'text-rose-600'
                                  : diff > 0
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {diff < 0
                                ? `(${currencySymbol}${formatNumber(Math.abs(diff))})`
                                : `${currencySymbol}${formatNumber(diff)}`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Pending</span>
                          )}
                        </td>
                        {/* ACTION */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenRow(inc)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                              title={inc.hasActualCost ? 'Edit income' : 'Record actual'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!inc.isVirtualEstimate && (
                              <button
                                onClick={() => onDeleteEntry(inc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Reset to estimate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Income Total Row */}
                  <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 font-bold text-slate-900 dark:text-white border-t-2 border-emerald-500/30">
                    <td className="py-3 px-4 font-sans">Total Income</td>
                    <td className="py-3 px-4 text-right text-emerald-900 dark:text-emerald-200 font-mono text-sm">
                      {currencySymbol}{formatNumber(totalIncomeEstimated)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {currencySymbol}{formatNumber(totalIncomeActual)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      {incomeDifference < 0
                        ? `(${currencySymbol}${formatNumber(Math.abs(incomeDifference))})`
                        : `${currencySymbol}${formatNumber(incomeDifference)}`}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. MONTHLY EXPENSES MASTER SPREADSHEET TABLE - PRE-POPULATED ESTIMATES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Monthly Expenses &amp; Outflows ({selectedPeriod})
                </span>
                <span className="text-[10px] text-slate-500 font-mono bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                  {unifiedExpenseRows.length} pre-populated lines
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAdd('expense')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Custom Line Item</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-[11px] font-mono border-collapse whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-sans font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">Category</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700">Item</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-r border-slate-200 dark:border-slate-700">
                      Estimated Cost (Pre-populated)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-rose-50/50 dark:bg-rose-950/20 font-bold border-r border-slate-200 dark:border-slate-700">
                      Actual Cost
                    </th>
                    
                    {/* Payment Breakdown Columns */}
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Stay in ATM
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Cash
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Credit Card
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      GCash Transfer
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Kath Account
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Check Account
                    </th>
                    <th className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                      Bank Transfer
                    </th>

                    <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700">Difference</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-sans">Status</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 font-sans">Reference</th>
                    <th className="py-2.5 px-2 text-center font-sans">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unifiedExpenseRows.map((exp) => {
                    const est = exp.estimatedCost;
                    const act = exp.actualCost;
                    const diff = exp.hasActualCost ? est - act : est;
                    const isSaving = exp.type === 'saving' || exp.category === 'Savings';

                    const atm = getMethodAmount(exp, 'Stay in ATM');
                    const cash = getMethodAmount(exp, 'Cash');
                    const cc = getMethodAmount(exp, 'Credit Card');
                    const gcash = getMethodAmount(exp, 'GCash Transfer');
                    const kath = getMethodAmount(exp, 'Kath Account');
                    const chk = getMethodAmount(exp, 'Checking Account');
                    const bank = getMethodAmount(exp, 'Bank Transfer');

                    return (
                      <tr
                        key={exp.id}
                        onClick={() => handleOpenRow(exp)}
                        className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                          isSaving ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {isSaving && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5" />
                          )}
                          {exp.category}
                        </td>

                        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span>{exp.item}</span>
                          {isSaving ? (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold">
                              &rarr; Ledger
                            </span>
                          ) : exp.isVirtualEstimate ? (
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              Estimate
                            </span>
                          ) : null}
                        </td>

                        {/* ESTIMATED COST COLUMN - PRE-POPULATED! */}
                        <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200 bg-amber-50/20 dark:bg-amber-950/10 border-r border-slate-100 dark:border-slate-800">
                          {currencySymbol}{formatNumber(est)}
                        </td>

                        {/* ACTUAL COST COLUMN */}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white bg-rose-50/20 dark:bg-rose-950/10 border-r border-slate-100 dark:border-slate-800">
                          {exp.hasActualCost ? (
                            `${currencySymbol}${formatNumber(act)}`
                          ) : (
                            <span className="text-slate-400 font-sans text-[10px] group-hover:text-indigo-600 transition-colors">
                              + Record actual
                            </span>
                          )}
                        </td>

                        {/* Payment breakdown cell values */}
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {atm > 0 ? `${currencySymbol}${formatNumber(atm)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {cash > 0 ? `${currencySymbol}${formatNumber(cash)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {cc > 0 ? `${currencySymbol}${formatNumber(cc)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {gcash > 0 ? `${currencySymbol}${formatNumber(gcash)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {kath > 0 ? `${currencySymbol}${formatNumber(kath)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {chk > 0 ? `${currencySymbol}${formatNumber(chk)}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {bank > 0 ? `${currencySymbol}${formatNumber(bank)}` : '—'}
                        </td>

                        {/* Difference */}
                        <td className="py-2 px-3 text-right font-medium border-r border-slate-100 dark:border-slate-800">
                          {exp.hasActualCost ? (
                            <span
                              className={
                                diff < 0
                                  ? 'text-rose-600 font-bold'
                                  : diff > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }
                            >
                              {diff < 0
                                ? `-${currencySymbol}${formatNumber(Math.abs(diff))}`
                                : `${currencySymbol}${formatNumber(diff)}`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Pending</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2 text-center font-sans border-r border-slate-100 dark:border-slate-800">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              exp.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : exp.status === 'Scheduled'
                                ? 'bg-blue-50 text-blue-700'
                                : exp.status === 'Estimated'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {exp.status || 'Paid'}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="py-2 px-3 font-sans text-slate-500 text-[10px] truncate max-w-[120px] border-r border-slate-100 dark:border-slate-800">
                          {exp.reference || '—'}
                        </td>

                        {/* Action */}
                        <td className="py-2 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenRow(exp)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                              title={exp.hasActualCost ? 'Edit entry' : 'Record actual'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!exp.isVirtualEstimate && (
                              <button
                                onClick={() => onDeleteEntry(exp.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Reset to estimate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUMMARY TOTALS ROW */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td colSpan={2} className="py-3 px-3 font-sans uppercase tracking-wider text-[11px]">
                      Total Expense &amp; Outflows
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-amber-800 dark:text-amber-300">
                      {currencySymbol}{formatNumber(totalExpenseEstimated)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400 text-xs font-mono">
                      {currencySymbol}{formatNumber(totalExpenseActual)}
                    </td>

                    {/* Breakdown Totals */}
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['Stay in ATM'] || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals.Cash || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['Credit Card'] || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['GCash Transfer'] || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['Kath Account'] || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['Checking Account'] || 0)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {currencySymbol}{formatNumber(paymentTotals['Bank Transfer'] || 0)}
                    </td>

                    <td className="py-3 px-3 text-right text-rose-600">
                      {expenseDifference < 0
                        ? `-${currencySymbol}${formatNumber(Math.abs(expenseDifference))}`
                        : `${currencySymbol}${formatNumber(expenseDifference)}`}
                    </td>
                    <td colSpan={3}></td>
                  </tr>

                  {/* Summary Income Row */}
                  <tr className="bg-slate-50 dark:bg-slate-850 font-semibold text-slate-700 dark:text-slate-300">
                    <td colSpan={2} className="py-2.5 px-3 font-sans">
                      Income
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">
                      {currencySymbol}{formatNumber(totalIncomeEstimated)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}{formatNumber(totalIncomeActual)}
                    </td>
                    <td colSpan={11}></td>
                  </tr>

                  {/* REMAINING EXTRA SALARY ROW */}
                  <tr className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 dark:from-emerald-950/60 dark:to-teal-950/60 font-bold text-slate-900 dark:text-white border-t border-emerald-300 dark:border-emerald-800">
                    <td colSpan={2} className="py-3 px-3 font-sans text-xs text-emerald-900 dark:text-emerald-200">
                      Extra / Remaining to Salary
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800 dark:text-emerald-300">
                      {currencySymbol}{formatNumber(remainingExtraEstimated)} (Est)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700 dark:text-emerald-300">
                      {currencySymbol}{formatNumber(remainingExtra)}
                    </td>
                    <td colSpan={11} className="py-3 px-3 font-sans text-[11px] text-emerald-800 dark:text-emerald-300">
                      {totalIncomeActual > 0
                        ? `₱${formatNumber(remainingExtra)} remaining from your recorded salary!`
                        : `₱${formatNumber(remainingExtraEstimated)} projected remaining from estimated budget.`}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Channel Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Payment Channel Breakdown ({selectedPeriod})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Distribution of actual recorded expenses across payment methods
                  </span>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 mr-1">Total Actual:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currencySymbol}{formatNumber(totalExpenseActual)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4 text-xs">
              {PAYMENT_METHODS.map((method) => {
                const amt = paymentTotals[method] || 0;
                const pct = totalExpenseActual > 0 ? (amt / totalExpenseActual) * 100 : 0;
                return (
                  <div
                    key={method}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
                  >
                    <span className="text-slate-500 text-[11px] block truncate" title={method}>
                      {method}
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-1 block">
                      {currencySymbol}{formatNumber(amt)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {pct > 0 ? `${pct.toFixed(0)}% of total` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      {/* MODAL: ADD / EDIT ENTRY WITH PRE-POPULATED ESTIMATE TEXT AND SALARY HUD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  modalType === 'income'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : modalType === 'saving'
                    ? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                }`}>
                  {modalType === 'income' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : modalType === 'saving' ? (
                    <PiggyBank className="w-4 h-4" />
                  ) : (
                    <Receipt className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingEntryId ? 'Update Line Item' : `Record ${modalType.toUpperCase()} for ${modalPeriod}`}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Estimate amount is already pre-populated. Enter or adjust the actual amount.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              
              {/* 1. PERIOD SELECTION */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Target Entry Period ({budget.year})</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={modalPeriod}
                    onChange={(e) => setModalPeriod(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {periodList.map((p) => (
                      <option key={p} value={p}>
                        {frequency === 'monthly' ? `${p} (${budget.year})` : `${p} - Pay Period`}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                    {frequency === 'monthly' ? 'Monthly Mode' : 'Bi-Weekly Mode'}
                  </span>
                </div>
              </div>

              {/* 2. REAL-TIME REMAINING SALARY HUD FOR CHOSEN PERIOD */}
              <div className={`p-4 rounded-2xl border transition-all ${
                modalPeriodStats.projectedRemaining < 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-900 dark:text-white">
                      Salary &amp; Cash Flow HUD ({modalPeriod})
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    modalPeriodStats.projectedRemaining < 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}>
                    {modalPeriodStats.projectedRemaining < 0 ? 'Deficit / Exceeded' : 'Safe / Remaining'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Period Salary</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {currencySymbol}{formatNumber(modalPeriodStats.projectedIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Outflow</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {currencySymbol}{formatNumber(modalPeriodStats.projectedExpense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Remaining Salary</span>
                    <span className={`font-mono font-black text-xs ${
                      modalPeriodStats.projectedRemaining < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {currencySymbol}{formatNumber(modalPeriodStats.projectedRemaining)}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-2.5">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, modalPeriodStats.usedPercentage))}%` }}
                      className={`h-full transition-all duration-300 ${
                        modalPeriodStats.projectedRemaining < 0
                          ? 'bg-rose-500'
                          : modalPeriodStats.usedPercentage > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>
                      {modalPeriodStats.projectedRemaining < 0
                        ? `⚠️ Warning: Exceeds ${modalPeriod} salary by ${currencySymbol}${formatNumber(Math.abs(modalPeriodStats.projectedRemaining))}`
                        : `✅ ${currencySymbol}${formatNumber(modalPeriodStats.projectedRemaining)} will remain from your salary`}
                    </span>
                    <span className="font-mono font-semibold">
                      {modalPeriodStats.usedPercentage.toFixed(0)}% Allocated
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. TYPE SWITCHER */}
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Entry Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalType('expense');
                      const firstTpl = itemTemplates.find((t) => t.type === 'expense');
                      if (firstTpl) {
                        setFormCategory(firstTpl.category);
                        setFormItem(firstTpl.item);
                        setFormEstimated(String(firstTpl.defaultEstimatedCost || ''));
                        setFormActual(String(firstTpl.defaultEstimatedCost || ''));
                        setSelectedTemplateId(firstTpl.id);
                      } else {
                        setFormCategory(expenseCategories[0] || 'Budget');
                        setSelectedTemplateId('');
                      }
                    }}
                    className={`py-2 rounded-xl font-semibold border transition-all ${
                      modalType === 'expense'
                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 text-rose-700 dark:text-rose-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType('income');
                      const firstTpl = itemTemplates.find((t) => t.type === 'income');
                      if (firstTpl) {
                        setFormCategory(firstTpl.category);
                        setFormItem(firstTpl.item);
                        setFormEstimated(String(firstTpl.defaultEstimatedCost || ''));
                        setFormActual(String(firstTpl.defaultEstimatedCost || ''));
                        setSelectedTemplateId(firstTpl.id);
                      } else {
                        setFormCategory(incomeCategories[0] || 'Salary');
                        setSelectedTemplateId('');
                      }
                    }}
                    className={`py-2 rounded-xl font-semibold border transition-all ${
                      modalType === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType('saving');
                      const firstTpl = itemTemplates.find((t) => t.type === 'saving');
                      if (firstTpl) {
                        setFormCategory(firstTpl.category);
                        setFormItem(firstTpl.item);
                        setFormEstimated(String(firstTpl.defaultEstimatedCost || ''));
                        setFormActual(String(firstTpl.defaultEstimatedCost || ''));
                        setSelectedTemplateId(firstTpl.id);
                      } else {
                        setFormCategory(savingCategories[0] || 'Savings');
                        setSelectedTemplateId('');
                      }
                    }}
                    className={`py-2 rounded-xl font-semibold border transition-all ${
                      modalType === 'saving'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Saving (To Ledger)
                  </button>
                </div>
              </div>

              {/* 4. ITEM SELECTION & PRE-POPULATED ESTIMATE SELECTOR */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Choose Line Item (Auto-fills Estimated Cost)</span>
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
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">⚡ Select Item Preset...</option>
                  {itemTemplates
                    .filter((t) => t.type === modalType)
                    .map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.item} ({tpl.category}) — Est: {currencySymbol}{formatNumber(tpl.defaultEstimatedCost)}
                      </option>
                    ))}
                </select>
              </div>

              {/* 5. CATEGORY & ITEM NAME */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsManagerModalOpen(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      + Manage
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {(modalType === 'income'
                      ? incomeCategories
                      : modalType === 'saving'
                      ? savingCategories
                      : expenseCategories
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Line Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meralco, Kath allowance, Pag-ibig"
                    value={formItem}
                    onChange={(e) => handleItemChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* 6. ESTIMATED COST (ALREADY PRE-POPULATED!) & ACTUAL COST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
                      <span>Estimated Cost ({currencySymbol})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold">
                        Pre-populated
                      </span>
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3500"
                    value={formEstimated}
                    onChange={(e) => setFormEstimated(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pre-populated from your saved estimated budget.
                  </p>
                </div>

                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 dark:text-slate-200 font-bold">
                      Actual Cost ({currencySymbol})
                    </label>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Recorded Payment
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 3500"
                    value={formActual}
                    onChange={(e) => setFormActual(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter actual amount paid or received.
                  </p>
                </div>
              </div>

              {/* 7. PAYMENT METHOD / CHANNEL */}
              {modalType !== 'income' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Payment Channel / Account
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 8. IF SAVING: CHOOSE LEDGER ACCOUNT */}
              {modalType === 'saving' && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <PiggyBank className="w-4 h-4" />
                    <span>Destination Savings Ledger Account</span>
                  </div>
                  <select
                    value={formSavingAccountId}
                    onChange={(e) => setFormSavingAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 rounded-lg text-xs"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 9. DATE, STATUS, REFERENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Reference / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. official receipt, check #104, transfer ref"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {modalType === 'expense' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="toBeWithdrawn"
                    checked={formToBeWithdrawn}
                    onChange={(e) => setFormToBeWithdrawn(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <label htmlFor="toBeWithdrawn" className="text-slate-700 dark:text-slate-300 font-medium">
                    Include in ATM / Cash Withdrawal list (for cash remittances &amp; allowances)
                  </label>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingEntryId ? 'Update Line Item' : 'Save to Period Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORY & ESTIMATED BUDGET TEMPLATE MANAGER */}
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
