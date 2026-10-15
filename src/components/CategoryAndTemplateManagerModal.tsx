import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sliders,
  DollarSign,
  PiggyBank,
  TrendingUp,
  Receipt,
  Sparkles,
  Banknote,
  FolderTree,
} from 'lucide-react';
import {
  BudgetItemTemplate,
  EntryType,
  PaymentMethod,
  YearBudgetData,
} from '../types/finance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVING_CATEGORIES,
  PAYMENT_METHODS,
  DEFAULT_ITEM_TEMPLATES,
} from '../services/sampleData';

interface CategoryAndTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: YearBudgetData;
  onUpdateCategories: (customCats: {
    expense: string[];
    income: string[];
    saving: string[];
  }) => void;
  onUpdateTemplates: (templates: BudgetItemTemplate[]) => void;
  currencySymbol?: string;
}

export const CategoryAndTemplateManagerModal: React.FC<CategoryAndTemplateManagerModalProps> = ({
  isOpen,
  onClose,
  budget,
  onUpdateCategories,
  onUpdateTemplates,
  currencySymbol = '₱',
}) => {
  const [activeTab, setActiveTab] = useState<'estimates' | 'expense_cats' | 'income_cats' | 'saving_cats'>('estimates');

  // Categories state
  const expenseCats = budget.customCategories?.expense || [...EXPENSE_CATEGORIES];
  const incomeCats = budget.customCategories?.income || [...INCOME_CATEGORIES];
  const savingCats = budget.customCategories?.saving || [...SAVING_CATEGORIES];

  const templates: BudgetItemTemplate[] = budget.itemTemplates || [...DEFAULT_ITEM_TEMPLATES];

  // Category editing state
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ original: string; current: string } | null>(null);

  // Template editing/add state
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [tplId, setTplId] = useState<string | null>(null);
  const [tplType, setTplType] = useState<EntryType>('expense');
  const [tplCategory, setTplCategory] = useState<string>(expenseCats[0] || 'Budget');
  const [tplItem, setTplItem] = useState<string>('');
  const [tplEstimated, setTplEstimated] = useState<string>('');
  const [tplMethod, setTplMethod] = useState<PaymentMethod>('Bank Transfer');
  const [tplWithdraw, setTplWithdraw] = useState<boolean>(false);

  if (!isOpen) return null;

  // Category handlers
  const handleAddCategory = (type: 'expense' | 'income' | 'saving') => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const updated = {
      expense: [...expenseCats],
      income: [...incomeCats],
      saving: [...savingCats],
    };

    if (type === 'expense' && !updated.expense.includes(trimmed)) {
      updated.expense.push(trimmed);
    } else if (type === 'income' && !updated.income.includes(trimmed)) {
      updated.income.push(trimmed);
    } else if (type === 'saving' && !updated.saving.includes(trimmed)) {
      updated.saving.push(trimmed);
    }

    onUpdateCategories(updated);
    setNewCatName('');
  };

  const handleDeleteCategory = (type: 'expense' | 'income' | 'saving', name: string) => {
    const updated = {
      expense: expenseCats.filter((c) => c !== name),
      income: incomeCats.filter((c) => c !== name),
      saving: savingCats.filter((c) => c !== name),
    };
    onUpdateCategories(updated);
  };

  const handleSaveEditCategory = (type: 'expense' | 'income' | 'saving') => {
    if (!editingCat || !editingCat.current.trim()) return;
    const oldName = editingCat.original;
    const newName = editingCat.current.trim();

    const updated = {
      expense: expenseCats.map((c) => (c === oldName ? newName : c)),
      income: incomeCats.map((c) => (c === oldName ? newName : c)),
      saving: savingCats.map((c) => (c === oldName ? newName : c)),
    };
    onUpdateCategories(updated);
    setEditingCat(null);
  };

  // Template handlers
  const handleOpenAddTemplate = () => {
    setTplId(null);
    setTplType('expense');
    setTplCategory(expenseCats[0] || 'Budget');
    setTplItem('');
    setTplEstimated('');
    setTplMethod('Bank Transfer');
    setTplWithdraw(false);
    setIsTemplateFormOpen(true);
  };

  const handleOpenEditTemplate = (tpl: BudgetItemTemplate) => {
    setTplId(tpl.id);
    setTplType(tpl.type);
    setTplCategory(tpl.category);
    setTplItem(tpl.item);
    setTplEstimated(String(tpl.defaultEstimatedCost || ''));
    setTplMethod(tpl.defaultPaymentMethod || 'Bank Transfer');
    setTplWithdraw(Boolean(tpl.toBeWithdrawn));
    setIsTemplateFormOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplItem.trim()) return;
    const estNum = parseFloat(tplEstimated) || 0;

    let updatedList = [...templates];
    if (tplId) {
      updatedList = updatedList.map((t) =>
        t.id === tplId
          ? {
              ...t,
              type: tplType,
              category: tplCategory,
              item: tplItem.trim(),
              defaultEstimatedCost: estNum,
              defaultPaymentMethod: tplMethod,
              toBeWithdrawn: tplWithdraw,
            }
          : t
      );
    } else {
      const newTpl: BudgetItemTemplate = {
        id: `tpl-${Date.now()}`,
        type: tplType,
        category: tplCategory,
        item: tplItem.trim(),
        defaultEstimatedCost: estNum,
        defaultPaymentMethod: tplMethod,
        toBeWithdrawn: tplWithdraw,
      };
      updatedList.push(newTpl);
    }

    onUpdateTemplates(updatedList);
    setIsTemplateFormOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    onUpdateTemplates(templates.filter((t) => t.id !== id));
  };

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(num);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Manage Estimated Budgets &amp; Categories
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure default estimated costs for auto-populating monthly records, and customize your income, expense, and savings categories.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('estimates')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'estimates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly Estimated Budget Templates ({templates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expense_cats')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'expense_cats'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Expense Categories ({expenseCats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('income_cats')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'income_cats'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Income Categories ({incomeCats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saving_cats')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'saving_cats'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>Saving Categories ({savingCats.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          
          {/* TAB 1: ESTIMATED BUDGET ITEMS TEMPLATES */}
          {activeTab === 'estimates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Pre-Populated Estimated Budget Registry
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    When adding entries or auto-filling a month, these default estimates and payment channels are automatically applied.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddTemplate}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Estimated Item</span>
                </button>
              </div>

              {/* Template Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Line Item</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Default Estimated Cost</th>
                      <th className="py-2.5 px-4">Default Payment Channel</th>
                      <th className="py-2.5 px-3 text-center">ATM Withdrawal</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {templates.map((tpl) => (
                      <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {tpl.item}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tpl.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700'
                                : tpl.type === 'saving'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tpl.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                          {tpl.category}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {currencySymbol}{formatNumber(tpl.defaultEstimatedCost)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                          {tpl.defaultPaymentMethod || 'Bank Transfer'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {tpl.toBeWithdrawn ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[10px]">
                              Yes (Cash)
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditTemplate(tpl)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: CATEGORY MANAGERS */}
          {activeTab !== 'estimates' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Add category row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`New ${activeTab.replace('_cats', '')} category name...`}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory(
                        activeTab === 'expense_cats'
                          ? 'expense'
                          : activeTab === 'income_cats'
                          ? 'income'
                          : 'saving'
                      );
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddCategory(
                      activeTab === 'expense_cats'
                        ? 'expense'
                        : activeTab === 'income_cats'
                        ? 'income'
                        : 'saving'
                    )
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              {/* List of categories */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {(activeTab === 'expense_cats'
                  ? expenseCats
                  : activeTab === 'income_cats'
                  ? incomeCats
                  : savingCats
                ).map((cat) => (
                  <div
                    key={cat}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {editingCat?.original === cat ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editingCat.current}
                          onChange={(e) =>
                            setEditingCat({ ...editingCat, current: e.target.value })
                          }
                          className="px-3 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg flex-1"
                        />
                        <button
                          onClick={() =>
                            handleSaveEditCategory(
                              activeTab === 'expense_cats'
                                ? 'expense'
                                : activeTab === 'income_cats'
                                ? 'income'
                                : 'saving'
                            )
                          }
                          className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCat(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCat({ original: cat, current: cat })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                        title="Rename category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCategory(
                            activeTab === 'expense_cats'
                              ? 'expense'
                              : activeTab === 'income_cats'
                              ? 'income'
                              : 'saving',
                            cat
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Changes automatically save to your annual database and Google Drive.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl"
          >
            Done
          </button>
        </div>

      </div>

      {/* SUB-MODAL: ADD / EDIT ITEM TEMPLATE */}
      {isTemplateFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tplId ? 'Edit Estimated Item Template' : 'New Estimated Item Template'}
              </h3>
              <button onClick={() => setIsTemplateFormOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTplType('expense');
                      setTplCategory(expenseCats[0] || 'Budget');
                    }}
                    className={`py-1.5 rounded-lg font-semibold border ${
                      tplType === 'expense'
                        ? 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTplType('income');
                      setTplCategory(incomeCats[0] || 'Salary');
                    }}
                    className={`py-1.5 rounded-lg font-semibold border ${
                      tplType === 'income'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTplType('saving');
                      setTplCategory('Savings');
                    }}
                    className={`py-1.5 rounded-lg font-semibold border ${
                      tplType === 'saving'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Saving
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {(tplType === 'income'
                    ? incomeCats
                    : tplType === 'saving'
                    ? savingCats
                    : expenseCats
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Line Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meralco, Kath allowance, Pag-ibig"
                  value={tplItem}
                  onChange={(e) => setTplItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Default Estimated Cost ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 3500"
                  value={tplEstimated}
                  onChange={(e) => setTplEstimated(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Default Payment Channel
                </label>
                <select
                  value={tplMethod}
                  onChange={(e) => setTplMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {tplType === 'expense' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="tplWithdraw"
                    checked={tplWithdraw}
                    onChange={(e) => setTplWithdraw(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <label htmlFor="tplWithdraw" className="text-slate-700 dark:text-slate-300 font-medium">
                    Include in ATM / Cash Withdrawal list (for cash remittances)
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTemplateFormOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Template Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
