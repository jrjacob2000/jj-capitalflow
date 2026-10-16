import { YearBudgetData, SavingsLedgerData, BudgetEntry, SavingsTransaction, DriveFileInfo } from '../types/finance';
import {
  getBudgetFileName,
  SAVINGS_LEDGER_FILE_NAME,
  findDriveFile,
  downloadJsonFile,
  saveJsonToDrive,
  listCapitalFlowFiles,
} from './driveService';
import { generateInitial2026Budget, generateInitialSavingsLedger, createEmptyYearBudget } from './sampleData';

const LOCAL_STORAGE_KEY_PREFIX = 'capitalflow_local_budget_';
const LOCAL_STORAGE_KEY_LEDGER = 'capitalflow_local_savings_ledger';
const LOCAL_STORAGE_KEY_YEARS = 'capitalflow_known_years';
const LIVE_CLEAN_STORAGE_KEY = 'capitalflow_live_clean_v1';

export class FinanceStorageService {
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
   * to provide a pristine database state ready for live production.
   */
  static resetAllDataForGoLive(): { budget: YearBudgetData; ledger: SavingsLedgerData } {
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

    const cleanBudget = createEmptyYearBudget(2026);
    FinanceStorageService.saveLocalBudget(cleanBudget);

    const cleanLedger = generateInitialSavingsLedger(cleanBudget);
    FinanceStorageService.saveLocalSavingsLedger(cleanLedger);

    localStorage.setItem(LOCAL_STORAGE_KEY_YEARS, JSON.stringify([2026]));
    localStorage.setItem(LIVE_CLEAN_STORAGE_KEY, 'true');

    return { budget: cleanBudget, ledger: cleanLedger };
  }

  /**
   * Load budget for a specific year.
   * Priority: LocalStorage -> Clean Empty budget.
   */
  static loadLocalBudget(year: number): YearBudgetData {
    FinanceStorageService.checkAndPerformAutoClean();
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${year}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse cached budget for year', year, e);
      }
    }

    const cleanBudget = year === 2026 ? generateInitial2026Budget() : createEmptyYearBudget(year);
    FinanceStorageService.saveLocalBudget(cleanBudget);
    FinanceStorageService.registerKnownYear(year);
    return cleanBudget;
  }

  static saveLocalBudget(budget: YearBudgetData): void {
    budget.lastUpdated = new Date().toISOString();
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
        const diff = entry.amount - prev.amount;
        prev.amount = entry.amount;
        prev.date = entry.date;
        prev.period = entry.period;
        prev.note = entry.description || entry.category;
        prev.accountId = targetAccount.id;
        prev.accountName = targetAccount.name;

        if (targetAccount) {
          targetAccount.balance += diff;
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
   * Syncs budget to Drive and returns updated file metadata
   */
  static async syncBudgetToDrive(
    accessToken: string,
    budget: YearBudgetData,
    fileId?: string | null
  ): Promise<{ fileId: string; modifiedTime: string }> {
    const fileName = getBudgetFileName(budget.year);
    const result = await saveJsonToDrive(accessToken, fileName, budget, fileId);
    return { fileId: result.id, modifiedTime: result.modifiedTime };
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

    const data = await downloadJsonFile<YearBudgetData>(accessToken, file.id);
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
    FinanceStorageService.saveLocalBudget(result.budget);
    return result;
  }

  /**
   * Syncs savings ledger to Google Drive
   */
  static async syncLedgerToDrive(
    accessToken: string,
    ledger: SavingsLedgerData,
    fileId?: string | null
  ): Promise<{ fileId: string; modifiedTime: string }> {
    const result = await saveJsonToDrive(accessToken, SAVINGS_LEDGER_FILE_NAME, ledger, fileId);
    return { fileId: result.id, modifiedTime: result.modifiedTime };
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
}
