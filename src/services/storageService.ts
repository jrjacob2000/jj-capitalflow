import {
  YearBudgetData,
  SavingsLedgerData,
  BudgetTemplateData,
  BudgetEntry,
  SavingsTransaction,
  DriveFileInfo,
  BudgetItemTemplate,
} from '../types/finance';
import {
  getBudgetFileName,
  SAVINGS_LEDGER_FILE_NAME,
  BUDGET_TEMPLATE_FILE_NAME,
  findDriveFile,
  downloadJsonFile,
  saveJsonToDrive,
  listCapitalFlowFiles,
  findCapitalFlowFolder,
  ensureCapitalFlowFolder,
  organizeCapitalFlowFilesInFolder,
} from './driveService';
import {
  generateInitial2026Budget,
  generateInitialSavingsLedger,
  createEmptyYearBudget,
  DEFAULT_ITEM_TEMPLATES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVING_CATEGORIES,
  isLegacyHardcodedTemplate,
  deriveCategoryBudgetsFromTemplates,
} from './sampleData';

const LOCAL_STORAGE_KEY_PREFIX = 'capitalflow_local_budget_';
const LOCAL_STORAGE_KEY_LEDGER = 'capitalflow_local_savings_ledger';
const LOCAL_STORAGE_KEY_YEARS = 'capitalflow_known_years';
const LOCAL_STORAGE_KEY_USER_TEMPLATE = 'capitalflow_user_template_profile';
const LIVE_CLEAN_STORAGE_KEY = 'capitalflow_live_clean_v1';

export interface UserTemplateProfile {
  version?: string;
  lastUpdated?: string;
  customCategories: {
    income: string[];
    expense: string[];
    saving: string[];
  };
  itemTemplates: BudgetItemTemplate[];
  isPersonalizedTemplate: boolean;
}

export class FinanceStorageService {
  /**
   * Loads the user's saved personalized template profile from localStorage if available
   */
  static loadUserTemplateProfile(): UserTemplateProfile | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_USER_TEMPLATE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UserTemplateProfile;
      if (parsed && Array.isArray(parsed.itemTemplates) && !isLegacyHardcodedTemplate(parsed.itemTemplates)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Could not load user template profile:', e);
    }
    return null;
  }

  /**
   * Saves the user's personalized template profile to localStorage
   */
  static saveUserTemplateProfile(profile: UserTemplateProfile): BudgetTemplateData {
    const fullData: BudgetTemplateData = {
      version: profile.version || '1.0.0',
      lastUpdated: profile.lastUpdated || new Date().toISOString(),
      isPersonalizedTemplate: profile.isPersonalizedTemplate,
      customCategories: {
        expense: [...(profile.customCategories?.expense || EXPENSE_CATEGORIES)],
        income: [...(profile.customCategories?.income || INCOME_CATEGORIES)],
        saving: [...(profile.customCategories?.saving || SAVING_CATEGORIES)],
      },
      itemTemplates: (profile.itemTemplates || DEFAULT_ITEM_TEMPLATES).map((t) => ({ ...t })),
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER_TEMPLATE, JSON.stringify(fullData));
    } catch (e) {
      console.warn('Could not save user template profile:', e);
    }
    return fullData;
  }

  /**
   * Loads the standalone BudgetTemplateData object (used for capitalflow_budget_template.json)
   */
  static loadLocalTemplateData(fallbackBudget?: YearBudgetData): BudgetTemplateData {
    const saved = FinanceStorageService.loadUserTemplateProfile();
    if (saved) {
      return {
        version: saved.version || '1.0.0',
        lastUpdated: saved.lastUpdated || fallbackBudget?.lastUpdated || new Date().toISOString(),
        isPersonalizedTemplate: Boolean(saved.isPersonalizedTemplate),
        customCategories: {
          expense: [...(saved.customCategories?.expense || EXPENSE_CATEGORIES)],
          income: [...(saved.customCategories?.income || INCOME_CATEGORIES)],
          saving: [...(saved.customCategories?.saving || SAVING_CATEGORIES)],
        },
        itemTemplates: saved.itemTemplates.map((t) => ({ ...t })),
      };
    }

    if (fallbackBudget && Array.isArray(fallbackBudget.itemTemplates) && fallbackBudget.customCategories) {
      return {
        version: '1.0.0',
        lastUpdated: fallbackBudget.lastUpdated || new Date().toISOString(),
        isPersonalizedTemplate: Boolean(fallbackBudget.isPersonalizedTemplate),
        customCategories: {
          expense: [...fallbackBudget.customCategories.expense],
          income: [...fallbackBudget.customCategories.income],
          saving: [...fallbackBudget.customCategories.saving],
        },
        itemTemplates: fallbackBudget.itemTemplates.map((t) => ({ ...t })),
      };
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      isPersonalizedTemplate: false,
      customCategories: {
        expense: [...EXPENSE_CATEGORIES],
        income: [...INCOME_CATEGORIES],
        saving: [...SAVING_CATEGORIES],
      },
      itemTemplates: DEFAULT_ITEM_TEMPLATES.map((t) => ({ ...t })),
    };
  }

  /**
   * Applies a standalone BudgetTemplateData object to local profile storage and the active year budget
   */
  static applyTemplateDataToBudget(
    templateData: BudgetTemplateData,
    currentBudget: YearBudgetData
  ): YearBudgetData {
    const normalizedCategories = {
      expense: [...(templateData.customCategories?.expense || EXPENSE_CATEGORIES)],
      income: [...(templateData.customCategories?.income || INCOME_CATEGORIES)],
      saving: [...(templateData.customCategories?.saving || SAVING_CATEGORIES)],
    };

    // Preserve any categories referenced by existing recorded entries in currentBudget
    (currentBudget.entries || []).forEach((entry) => {
      if (!entry.category) return;
      const list =
        entry.type === 'income'
          ? normalizedCategories.income
          : entry.type === 'saving'
          ? normalizedCategories.saving
          : normalizedCategories.expense;
      if (!list.includes(entry.category)) {
        list.push(entry.category);
      }
    });

    const normalizedTemplates = (templateData.itemTemplates || DEFAULT_ITEM_TEMPLATES).map((t) => ({
      ...t,
    }));

    FinanceStorageService.saveUserTemplateProfile({
      version: templateData.version || '1.0.0',
      lastUpdated: templateData.lastUpdated || new Date().toISOString(),
      customCategories: normalizedCategories,
      itemTemplates: normalizedTemplates,
      isPersonalizedTemplate: Boolean(templateData.isPersonalizedTemplate ?? true),
    });

    const updatedBudget: YearBudgetData = {
      ...currentBudget,
      customCategories: normalizedCategories,
      itemTemplates: normalizedTemplates,
      isPersonalizedTemplate: Boolean(templateData.isPersonalizedTemplate ?? true),
      budgets: deriveCategoryBudgetsFromTemplates(normalizedTemplates),
      lastUpdated: new Date().toISOString(),
    };

    FinanceStorageService.saveLocalBudget(updatedBudget);
    return updatedBudget;
  }

  /**
   * Ensures a YearBudgetData object has valid personalized or default starter templates & categories,
   * and migrates away from any legacy hardcoded demo templates while preserving categories used in entries.
   */
  static normalizeBudgetTemplates(budget: YearBudgetData): { budget: YearBudgetData; didMigrate: boolean } {
    let didMigrate = false;
    const savedProfile = FinanceStorageService.loadUserTemplateProfile();

    const hasLegacyTemplates =
      !budget.isPersonalizedTemplate && isLegacyHardcodedTemplate(budget.itemTemplates);
    const hasMissingTemplates = !Array.isArray(budget.itemTemplates);

    if (hasLegacyTemplates || hasMissingTemplates) {
      didMigrate = true;
      const baseTemplates = savedProfile
        ? savedProfile.itemTemplates.map((t) => ({ ...t }))
        : DEFAULT_ITEM_TEMPLATES.map((t) => ({ ...t }));

      const baseCategories = savedProfile
        ? {
            expense: [...savedProfile.customCategories.expense],
            income: [...savedProfile.customCategories.income],
            saving: [...savedProfile.customCategories.saving],
          }
        : {
            expense: [...EXPENSE_CATEGORIES],
            income: [...INCOME_CATEGORIES],
            saving: [...SAVING_CATEGORIES],
          };

      // Preserve any categories referenced by existing recorded entries
      (budget.entries || []).forEach((entry) => {
        if (!entry.category) return;
        const list =
          entry.type === 'income'
            ? baseCategories.income
            : entry.type === 'saving'
            ? baseCategories.saving
            : baseCategories.expense;
        if (!list.includes(entry.category)) {
          list.push(entry.category);
        }
      });

      budget.itemTemplates = baseTemplates;
      budget.customCategories = baseCategories;
      budget.isPersonalizedTemplate = Boolean(savedProfile?.isPersonalizedTemplate);
    } else if (!budget.customCategories) {
      didMigrate = true;
      budget.customCategories = {
        expense: [...EXPENSE_CATEGORIES],
        income: [...INCOME_CATEGORIES],
        saving: [...SAVING_CATEGORIES],
      };
    }

    budget.budgets = deriveCategoryBudgetsFromTemplates(budget.itemTemplates || []);
    return { budget, didMigrate };
  }

  /**
   * Automatically clears legacy demo/sample data once on first load for Go Live
   */
  static checkAndPerformAutoClean(): void {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(LIVE_CLEAN_STORAGE_KEY) !== 'true') {
        FinanceStorageService.resetAllDataForGoLive();
      }
    } catch (e) {
      console.warn('Auto clean check encountered an error:', e);
    }
  }

  /**
   * Complete reset: wipes all test/sample records, transactions, and balances
   * to provide a pristine database state ready for live production, while preserving
   * the user's personalized categories and estimated budget templates (or initializing default starter template).
   */
  static resetAllDataForGoLive(): { budget: YearBudgetData; ledger: SavingsLedgerData } {
    const savedProfile = FinanceStorageService.loadUserTemplateProfile();
    try {
      // Clean all local budget entries and caches
      const years = FinanceStorageService.getKnownYears();
      years.forEach((y) => {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${y}`);
      });
      localStorage.removeItem(LOCAL_STORAGE_KEY_LEDGER);
      localStorage.removeItem(LOCAL_STORAGE_KEY_YEARS);
    } catch (e) {
      console.warn('Error clearing localStorage during reset:', e);
    }

    const cleanBudget = createEmptyYearBudget(2026, savedProfile || undefined);
    FinanceStorageService.saveLocalBudget(cleanBudget);

    const cleanLedger = generateInitialSavingsLedger(cleanBudget);
    FinanceStorageService.saveLocalSavingsLedger(cleanLedger);

    localStorage.setItem(LOCAL_STORAGE_KEY_YEARS, JSON.stringify([2026]));
    localStorage.setItem(LIVE_CLEAN_STORAGE_KEY, 'true');

    return { budget: cleanBudget, ledger: cleanLedger };
  }

  /**
   * Load budget for a specific year.
   * Priority: LocalStorage -> User's Personalized Template Profile -> Default Common Estimate Budget.
   */
  static loadLocalBudget(year: number): YearBudgetData {
    FinanceStorageService.checkAndPerformAutoClean();
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${year}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as YearBudgetData;
        const { budget: normalized, didMigrate } = FinanceStorageService.normalizeBudgetTemplates(parsed);
        if (didMigrate) {
          localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${year}`, JSON.stringify(normalized));
        }
        return normalized;
      } catch (e) {
        console.error('Failed to parse cached budget for year', year, e);
      }
    }

    const savedProfile = FinanceStorageService.loadUserTemplateProfile();
    const cleanBudget = createEmptyYearBudget(year, savedProfile || undefined);
    FinanceStorageService.saveLocalBudget(cleanBudget);
    FinanceStorageService.registerKnownYear(year);
    return cleanBudget;
  }

  static saveLocalBudget(budget: YearBudgetData): void {
    budget.lastUpdated = new Date().toISOString();
    budget.budgets = deriveCategoryBudgetsFromTemplates(budget.itemTemplates || []);
    if (budget.isPersonalizedTemplate && budget.customCategories && Array.isArray(budget.itemTemplates)) {
      FinanceStorageService.saveUserTemplateProfile({
        lastUpdated: budget.lastUpdated,
        customCategories: budget.customCategories,
        itemTemplates: budget.itemTemplates,
        isPersonalizedTemplate: true,
      });
    }
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${budget.year}`, JSON.stringify(budget));
    FinanceStorageService.registerKnownYear(budget.year);
  }

  static registerKnownYear(year: number): void {
    const years = FinanceStorageService.getKnownYears();
    if (!years.includes(year)) {
      years.push(year);
      years.sort((a, b) => b - a); // descending
      localStorage.setItem(LOCAL_STORAGE_KEY_YEARS, JSON.stringify(years));
    }
  }

  static getKnownYears(): number[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_YEARS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse known years', e);
      }
    }
    return [2026];
  }

  /**
   * Load savings ledger.
   */
  static loadLocalSavingsLedger(): SavingsLedgerData {
    FinanceStorageService.checkAndPerformAutoClean();
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_LEDGER);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse cached savings ledger', e);
      }
    }

    const budget2026 = FinanceStorageService.loadLocalBudget(2026);
    const initialLedger = generateInitialSavingsLedger(budget2026);
    FinanceStorageService.saveLocalSavingsLedger(initialLedger);
    return initialLedger;
  }

  static saveLocalSavingsLedger(ledger: SavingsLedgerData): void {
    ledger.lastUpdated = new Date().toISOString();
    // Recompute running totals
    let running = ledger.initialCapital || 0;
    const sorted = [...ledger.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((tx) => {
      if (tx.source === 'withdrawal') {
        running -= tx.amount;
      } else if (tx.source === 'transfer') {
        // Transfers between savings accounts do not change total overall capital
      } else {
        running += tx.amount;
      }
      tx.runningTotalCapital = running;
    });
    ledger.transactions = sorted;
    localStorage.setItem(LOCAL_STORAGE_KEY_LEDGER, JSON.stringify(ledger));
  }

  /**
   * Sync saving entry from budget into the separate savings ledger
   */
  static accumulateBudgetSavingToLedger(
    entry: BudgetEntry,
    isDelete: boolean = false
  ): SavingsLedgerData {
    const ledger = FinanceStorageService.loadLocalSavingsLedger();

    const existingIndex = ledger.transactions.findIndex(
      (tx) => tx.budgetEntryId === entry.id
    );

    if (isDelete) {
      if (existingIndex >= 0) {
        const removed = ledger.transactions.splice(existingIndex, 1)[0];
        // update account balance
        const acc = ledger.accounts.find((a) => a.id === removed.accountId);
        if (acc) {
          acc.balance = Math.max(0, acc.balance - removed.amount);
        }
      }
    } else {
      const accountId = entry.savingAccountId || ledger.accounts[0]?.id || 'acc-hysa';
      const targetAccount = ledger.accounts.find((a) => a.id === accountId) || ledger.accounts[0];

      if (existingIndex >= 0) {
        // Update existing transaction
        const prev = ledger.transactions[existingIndex];
        const prevAccountId = prev.accountId;
        const prevAmount = prev.amount;

        prev.amount = entry.amount;
        prev.date = entry.date;
        prev.period = entry.period;
        prev.note = entry.description || entry.category;
        prev.accountId = targetAccount.id;
        prev.accountName = targetAccount.name;

        if (prevAccountId !== targetAccount.id) {
          const oldAcc = ledger.accounts.find((a) => a.id === prevAccountId);
          if (oldAcc) {
            oldAcc.balance = Math.max(0, oldAcc.balance - prevAmount);
          }
          if (targetAccount) {
            targetAccount.balance = Math.max(0, targetAccount.balance + entry.amount);
          }
        } else if (targetAccount) {
          const diff = entry.amount - prevAmount;
          targetAccount.balance = Math.max(0, targetAccount.balance + diff);
        }
      } else {
        // Append new accumulated saving transaction
        const newTx: SavingsTransaction = {
          id: `tx-${entry.id}`,
          date: entry.date,
          year: entry.year,
          period: entry.period,
          amount: entry.amount,
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          source: 'budget_sync',
          budgetEntryId: entry.id,
          note: entry.description || entry.category,
        };
        ledger.transactions.push(newTx);
        targetAccount.balance += entry.amount;
      }
    }

    FinanceStorageService.saveLocalSavingsLedger(ledger);
    return ledger;
  }

  // --- GOOGLE DRIVE SYNC METHODS ---

  /**
   * Syncs budget to Drive inside the dedicated folder and returns updated file metadata
   */
  static async syncBudgetToDrive(
    accessToken: string,
    budget: YearBudgetData,
    fileId?: string | null
  ): Promise<{ fileId: string; modifiedTime: string; folderId: string }> {
    const fileName = getBudgetFileName(budget.year);
    const result = await saveJsonToDrive(accessToken, fileName, budget, fileId);
    return { fileId: result.id, modifiedTime: result.modifiedTime, folderId: result.folderId };
  }

  /**
   * Fetches budget for year from Google Drive without automatically overwriting localStorage.
   * If does not exist in Drive, returns null.
   */
  static async fetchBudgetFromDrive(
    accessToken: string,
    year: number
  ): Promise<{ budget: YearBudgetData; file: DriveFileInfo } | null> {
    const fileName = getBudgetFileName(year);
    const file = await findDriveFile(accessToken, fileName);
    if (!file) return null;

    const rawData = await downloadJsonFile<YearBudgetData>(accessToken, file.id);
    const { budget: data } = FinanceStorageService.normalizeBudgetTemplates(rawData);
    return { budget: data, file };
  }

  /**
   * Pulls budget for year from Google Drive and saves to local storage.
   */
  static async pullBudgetFromDrive(
    accessToken: string,
    year: number
  ): Promise<{ budget: YearBudgetData; file: DriveFileInfo } | null> {
    const result = await FinanceStorageService.fetchBudgetFromDrive(accessToken, year);
    if (!result) return null;
    if (
      Array.isArray(result.budget.itemTemplates) &&
      !isLegacyHardcodedTemplate(result.budget.itemTemplates) &&
      result.budget.customCategories
    ) {
      FinanceStorageService.saveUserTemplateProfile({
        customCategories: result.budget.customCategories,
        itemTemplates: result.budget.itemTemplates,
        isPersonalizedTemplate: Boolean(result.budget.isPersonalizedTemplate ?? true),
      });
    }
    FinanceStorageService.saveLocalBudget(result.budget);
    return result;
  }

  /**
   * Syncs savings ledger to Google Drive inside the dedicated folder
   */
  static async syncLedgerToDrive(
    accessToken: string,
    ledger: SavingsLedgerData,
    fileId?: string | null
  ): Promise<{ fileId: string; modifiedTime: string; folderId: string }> {
    const result = await saveJsonToDrive(accessToken, SAVINGS_LEDGER_FILE_NAME, ledger, fileId);
    return { fileId: result.id, modifiedTime: result.modifiedTime, folderId: result.folderId };
  }

  /**
   * Fetches savings ledger from Google Drive without automatically overwriting localStorage.
   */
  static async fetchLedgerFromDrive(
    accessToken: string
  ): Promise<{ ledger: SavingsLedgerData; file: DriveFileInfo } | null> {
    const file = await findDriveFile(accessToken, SAVINGS_LEDGER_FILE_NAME);
    if (!file) return null;

    const data = await downloadJsonFile<SavingsLedgerData>(accessToken, file.id);
    return { ledger: data, file };
  }

  /**
   * Pulls savings ledger from Google Drive and saves to local storage.
   */
  static async pullLedgerFromDrive(
    accessToken: string
  ): Promise<{ ledger: SavingsLedgerData; file: DriveFileInfo } | null> {
    const result = await FinanceStorageService.fetchLedgerFromDrive(accessToken);
    if (!result) return null;
    FinanceStorageService.saveLocalSavingsLedger(result.ledger);
    return result;
  }

  /**
   * Syncs standalone Estimate Budget & Categories Template (capitalflow_budget_template.json) to Google Drive
   */
  static async syncTemplateToDrive(
    accessToken: string,
    templateData: BudgetTemplateData,
    fileId?: string | null
  ): Promise<{ fileId: string; modifiedTime: string; folderId: string }> {
    const payload: BudgetTemplateData = {
      ...templateData,
      version: templateData.version || '1.0.0',
      lastUpdated: templateData.lastUpdated || new Date().toISOString(),
    };
    const result = await saveJsonToDrive(accessToken, BUDGET_TEMPLATE_FILE_NAME, payload, fileId);
    return { fileId: result.id, modifiedTime: result.modifiedTime, folderId: result.folderId };
  }

  /**
   * Fetches standalone Estimate Budget & Categories Template from Google Drive without overwriting local storage
   */
  static async fetchTemplateFromDrive(
    accessToken: string
  ): Promise<{ template: BudgetTemplateData; file: DriveFileInfo } | null> {
    const file = await findDriveFile(accessToken, BUDGET_TEMPLATE_FILE_NAME);
    if (!file) return null;

    const raw = await downloadJsonFile<BudgetTemplateData>(accessToken, file.id);
    const normalized: BudgetTemplateData = {
      version: raw.version || '1.0.0',
      lastUpdated: raw.lastUpdated || file.modifiedTime || new Date().toISOString(),
      isPersonalizedTemplate: Boolean(raw.isPersonalizedTemplate ?? true),
      customCategories: {
        expense: Array.isArray(raw.customCategories?.expense)
          ? raw.customCategories.expense
          : [...EXPENSE_CATEGORIES],
        income: Array.isArray(raw.customCategories?.income)
          ? raw.customCategories.income
          : [...INCOME_CATEGORIES],
        saving: Array.isArray(raw.customCategories?.saving)
          ? raw.customCategories.saving
          : [...SAVING_CATEGORIES],
      },
      itemTemplates:
        Array.isArray(raw.itemTemplates) && !isLegacyHardcodedTemplate(raw.itemTemplates)
          ? raw.itemTemplates
          : DEFAULT_ITEM_TEMPLATES.map((t) => ({ ...t })),
    };

    return { template: normalized, file };
  }

  /**
   * Pulls standalone Estimate Budget & Categories Template from Google Drive and applies it locally
   */
  static async pullTemplateFromDrive(
    accessToken: string,
    currentBudget: YearBudgetData
  ): Promise<{ template: BudgetTemplateData; updatedBudget: YearBudgetData; file: DriveFileInfo } | null> {
    const result = await FinanceStorageService.fetchTemplateFromDrive(accessToken);
    if (!result) return null;
    const updatedBudget = FinanceStorageService.applyTemplateDataToBudget(result.template, currentBudget);
    return { template: result.template, updatedBudget, file: result.file };
  }

  /**
   * Compares local vs drive timestamps with tolerance
   */
  static compareTimestamps(
    localIso?: string,
    driveIso?: string
  ): 'local_newer' | 'drive_newer' | 'same' {
    if (!localIso && !driveIso) return 'same';
    if (localIso && !driveIso) return 'local_newer';
    if (!localIso && driveIso) return 'drive_newer';

    const localMs = new Date(localIso!).getTime();
    const driveMs = new Date(driveIso!).getTime();

    if (isNaN(localMs) || isNaN(driveMs)) return 'same';

    // 2-second tolerance for sync / save clock differences
    if (Math.abs(localMs - driveMs) <= 2000) {
      return 'same';
    }

    return localMs > driveMs ? 'local_newer' : 'drive_newer';
  }

  /**
   * Discovers all annual files in Google Drive
   */
  static async fetchDriveFiles(accessToken: string): Promise<DriveFileInfo[]> {
    const files = await listCapitalFlowFiles(accessToken);
    files.forEach((file) => {
      const match = file.name.match(/capitalflow_budget_(\d{4})\.json/);
      if (match && match[1]) {
        FinanceStorageService.registerKnownYear(parseInt(match[1], 10));
      }
    });
    return files;
  }

  /**
   * Finds or creates the dedicated CapitalFlow folder in Google Drive
   */
  static async getOrCreateDriveFolder(accessToken: string, createIfMissing: boolean = false): Promise<DriveFileInfo | null> {
    if (createIfMissing) {
      return ensureCapitalFlowFolder(accessToken);
    }
    return findCapitalFlowFolder(accessToken);
  }

  /**
   * Ensures the dedicated folder exists and moves any existing CapitalFlow JSON files into it
   */
  static async organizeFilesIntoFolder(accessToken: string): Promise<{
    folder: DriveFileInfo;
    movedCount: number;
    files: DriveFileInfo[];
  }> {
    const res = await organizeCapitalFlowFilesInFolder(accessToken);
    res.files.forEach((file) => {
      const match = file.name.match(/capitalflow_budget_(\d{4})\.json/);
      if (match && match[1]) {
        FinanceStorageService.registerKnownYear(parseInt(match[1], 10));
      }
    });
    return res;
  }
}

