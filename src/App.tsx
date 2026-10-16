/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BudgetEntry,
  YearBudgetData,
  SavingsLedgerData,
  SavingsAccount,
  SavingsTransaction,
  EntryFrequency,
  EntryType,
  BudgetItemTemplate,
  DriveSyncStatus,
  DriveFileInfo,
} from './types/finance';
import { FinanceStorageService } from './services/storageService';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  clearCachedToken,
  isDriveTokenExpired,
  auth,
} from './services/firebase';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BudgetEntryView } from './components/BudgetEntryView';
import { SavingsLedgerView } from './components/SavingsLedgerView';
import { DriveFilesManagerView } from './components/DriveFilesManagerView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DriveConflictModal, DriveConflictDetail } from './components/DriveConflictModal';
import { DriveSessionExpiredModal } from './components/DriveSessionExpiredModal';
import {
  getBudgetFileName,
  SAVINGS_LEDGER_FILE_NAME,
  isSessionExpiredError,
  validateDriveToken,
} from './services/driveService';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025]);
  const [frequency, setFrequency] = useState<EntryFrequency>('monthly');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'budget' | 'savings' | 'drive'>('dashboard');

  // Core Financial Data
  const [budget, setBudget] = useState<YearBudgetData>(() =>
    FinanceStorageService.loadLocalBudget(2026)
  );
  const [ledger, setLedger] = useState<SavingsLedgerData>(() =>
    FinanceStorageService.loadLocalSavingsLedger()
  );

  // Google Drive & Auth State
  const [driveStatus, setDriveStatus] = useState<DriveSyncStatus>({
    isConfigured: true,
    isSignedIn: false,
    userEmail: null,
    userName: null,
    userPhoto: null,
    lastSyncedAt: null,
    isSyncing: false,
    error: null,
    budgetFileId: null,
    savingsFileId: null,
  });
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);

  // Conflict / Overwrite Prevention Modal State
  const [conflictModalState, setConflictModalState] = useState<{
    isOpen: boolean;
    items: DriveConflictDetail[];
  }>({
    isOpen: false,
    items: [],
  });

  // Google Drive Session Expired Modal State
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState<boolean>(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Centralized Google Drive session expired handler
  const handleSessionExpired = useCallback((customMsg?: string) => {
    clearCachedToken();
    setDriveStatus((prev) => ({
      ...prev,
      isSyncing: false,
      isSignedIn: false,
      isSessionExpired: true,
      error: customMsg || 'Google Drive session has expired. Please sign in again.',
    }));
    setIsSessionExpiredModalOpen(true);
    showToast(customMsg || 'Google Drive session expired. Please sign in again.', 'error');
  }, []);

  // Confirmation Modal State (required for Google Workspace mutating actions)
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    affectedItems: string[];
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    affectedItems: [],
    onConfirm: async () => {},
  });

  // Load known years on mount
  useEffect(() => {
    const years = FinanceStorageService.getKnownYears();
    setAvailableYears(years);
  }, []);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setIsSessionExpiredModalOpen(false);
        setDriveStatus((prev) => ({
          ...prev,
          isSignedIn: true,
          isSessionExpired: false,
          userEmail: user.email,
          userName: user.displayName || user.email?.split('@')[0] || 'User',
          userPhoto: user.photoURL,
          error: null,
        }));
        // Fetch existing Drive files
        try {
          const files = await FinanceStorageService.fetchDriveFiles(token);
          setDriveFiles(files);
          const years = FinanceStorageService.getKnownYears();
          setAvailableYears(years);
        } catch (e: any) {
          if (isSessionExpiredError(e)) {
            handleSessionExpired();
          } else {
            console.warn('Could not auto-fetch files on auth init:', e);
          }
        }
      },
      () => {
        const hasFirebaseUser = Boolean(auth.currentUser);
        setDriveStatus((prev) => ({
          ...prev,
          isSignedIn: false,
          isSessionExpired: hasFirebaseUser,
          error: hasFirebaseUser ? 'Google Drive session expired. Please sign in again.' : null,
          userEmail: hasFirebaseUser ? auth.currentUser?.email || prev.userEmail : null,
          userName: hasFirebaseUser ? auth.currentUser?.displayName || prev.userName : null,
          userPhoto: hasFirebaseUser ? auth.currentUser?.photoURL || prev.userPhoto : null,
        }));
        if (hasFirebaseUser) {
          setIsSessionExpiredModalOpen(true);
        }
      }
    );

    return () => unsubscribe();
  }, [handleSessionExpired]);

  // Proactively check session expiration (every 3 minutes and when window regains focus)
  useEffect(() => {
    if (!driveStatus.isSignedIn) return;

    const checkLiveness = async () => {
      if (isDriveTokenExpired()) {
        handleSessionExpired('Google Drive access token expired (1-hour limit). Please log in again.');
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        handleSessionExpired('Google Drive session has expired.');
        return;
      }
      const isValid = await validateDriveToken(token);
      if (!isValid) {
        handleSessionExpired('Google Drive authorization expired or was revoked.');
      }
    };

    const onFocus = () => {
      checkLiveness();
    };

    window.addEventListener('focus', onFocus);
    const interval = setInterval(checkLiveness, 3 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [driveStatus.isSignedIn, handleSessionExpired]);

  // Google Sign-In handler with local overwrite protection & conflict check
  const handleSignInWithGoogle = async () => {
    try {
      setDriveStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      const result = await googleSignIn();
      if (!result) {
        setDriveStatus((prev) => ({ ...prev, isSyncing: false }));
        return;
      }

      setIsSessionExpiredModalOpen(false);

      setDriveStatus((prev) => ({
        ...prev,
        isSignedIn: true,
        isSessionExpired: false,
        userEmail: result.user.email,
        userName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        userPhoto: result.user.photoURL,
        isSyncing: false,
        error: null,
      }));

      // Scan Google Drive for existing files
      const files = await FinanceStorageService.fetchDriveFiles(result.accessToken);
      setDriveFiles(files);

      const conflictItems: DriveConflictDetail[] = [];
      const currentLocalBudget = FinanceStorageService.loadLocalBudget(currentYear);
      const currentLocalLedger = FinanceStorageService.loadLocalSavingsLedger();

      // 1. Check if there is an existing annual file in Drive for currentYear
      const existingBudgetFile = files.find((f) => f.name === getBudgetFileName(currentYear));
      if (existingBudgetFile) {
        const driveBudgetRes = await FinanceStorageService.fetchBudgetFromDrive(result.accessToken, currentYear);
        if (driveBudgetRes) {
          const timestampStatus = FinanceStorageService.compareTimestamps(
            currentLocalBudget.lastUpdated,
            driveBudgetRes.budget.lastUpdated || driveBudgetRes.file.modifiedTime
          );

          // Check if contents are identical
          const isIdentical =
            JSON.stringify(currentLocalBudget.entries) === JSON.stringify(driveBudgetRes.budget.entries) &&
            currentLocalBudget.budgets?.length === driveBudgetRes.budget.budgets?.length &&
            JSON.stringify(currentLocalBudget.customCategories || {}) === JSON.stringify(driveBudgetRes.budget.customCategories || {});

          if (!isIdentical) {
            conflictItems.push({
              id: 'budget',
              title: `${currentYear} Annual Budget`,
              fileName: getBudgetFileName(currentYear),
              status: timestampStatus === 'local_newer' ? 'local_newer' : 'drive_newer',
              localTimestamp: currentLocalBudget.lastUpdated,
              driveTimestamp: driveBudgetRes.budget.lastUpdated || driveBudgetRes.file.modifiedTime,
              localStats: {
                count: currentLocalBudget.entries.length,
                countLabel: 'budget entries',
                detail: `₱${currentLocalBudget.entries.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()} recorded`,
              },
              driveStats: {
                count: driveBudgetRes.budget.entries.length,
                countLabel: 'budget entries',
                fileSize: driveBudgetRes.file.size ? `${Math.round(parseInt(driveBudgetRes.file.size, 10) / 1024)} KB` : undefined,
              },
              onKeepLocal: () => {
                showToast(`Kept local ${currentYear} budget (Drive copy was not loaded).`, 'info');
                setConflictModalState((prev) => ({
                  ...prev,
                  items: prev.items.filter((i) => i.id !== 'budget'),
                  isOpen: prev.items.filter((i) => i.id !== 'budget').length > 0,
                }));
              },
              onOverwriteWithDrive: () => {
                FinanceStorageService.saveLocalBudget(driveBudgetRes.budget);
                setBudget(driveBudgetRes.budget);
                showToast(`Loaded ${currentYear} budget from Google Drive.`, 'success');
                setConflictModalState((prev) => ({
                  ...prev,
                  items: prev.items.filter((i) => i.id !== 'budget'),
                  isOpen: prev.items.filter((i) => i.id !== 'budget').length > 0,
                }));
              },
              onPushToDrive: async () => {
                try {
                  await FinanceStorageService.syncBudgetToDrive(result.accessToken, currentLocalBudget, existingBudgetFile?.id);
                  const updatedFiles = await FinanceStorageService.fetchDriveFiles(result.accessToken);
                  setDriveFiles(updatedFiles);
                  showToast(`Uploaded local ${currentYear} budget to Google Drive!`, 'success');
                  setConflictModalState((prev) => ({
                    ...prev,
                    items: prev.items.filter((i) => i.id !== 'budget'),
                    isOpen: prev.items.filter((i) => i.id !== 'budget').length > 0,
                  }));
                } catch (err: any) {
                  showToast(`Upload failed: ${err.message}`, 'error');
                }
              },
            });
          }
        }
      }

      // 2. Check if there is an existing savings ledger in Drive
      const existingLedgerFile = files.find((f) => f.name === SAVINGS_LEDGER_FILE_NAME);
      if (existingLedgerFile) {
        const driveLedgerRes = await FinanceStorageService.fetchLedgerFromDrive(result.accessToken);
        if (driveLedgerRes) {
          const timestampStatus = FinanceStorageService.compareTimestamps(
            currentLocalLedger.lastUpdated,
            driveLedgerRes.ledger.lastUpdated || driveLedgerRes.file.modifiedTime
          );

          const isIdentical =
            JSON.stringify(currentLocalLedger.transactions) === JSON.stringify(driveLedgerRes.ledger.transactions) &&
            currentLocalLedger.accounts?.length === driveLedgerRes.ledger.accounts?.length &&
            currentLocalLedger.initialCapital === driveLedgerRes.ledger.initialCapital;

          if (!isIdentical) {
            conflictItems.push({
              id: 'ledger',
              title: 'Savings & Capital Ledger',
              fileName: SAVINGS_LEDGER_FILE_NAME,
              status: timestampStatus === 'local_newer' ? 'local_newer' : 'drive_newer',
              localTimestamp: currentLocalLedger.lastUpdated,
              driveTimestamp: driveLedgerRes.ledger.lastUpdated || driveLedgerRes.file.modifiedTime,
              localStats: {
                count: currentLocalLedger.transactions.length,
                countLabel: 'transactions',
                detail: `${currentLocalLedger.accounts.length} accounts`,
              },
              driveStats: {
                count: driveLedgerRes.ledger.transactions.length,
                countLabel: 'transactions',
                fileSize: driveLedgerRes.file.size ? `${Math.round(parseInt(driveLedgerRes.file.size, 10) / 1024)} KB` : undefined,
              },
              onKeepLocal: () => {
                showToast('Kept local savings ledger (Drive copy was not loaded).', 'info');
                setConflictModalState((prev) => ({
                  ...prev,
                  items: prev.items.filter((i) => i.id !== 'ledger'),
                  isOpen: prev.items.filter((i) => i.id !== 'ledger').length > 0,
                }));
              },
              onOverwriteWithDrive: () => {
                FinanceStorageService.saveLocalSavingsLedger(driveLedgerRes.ledger);
                setLedger(driveLedgerRes.ledger);
                showToast('Loaded savings ledger from Google Drive.', 'success');
                setConflictModalState((prev) => ({
                  ...prev,
                  items: prev.items.filter((i) => i.id !== 'ledger'),
                  isOpen: prev.items.filter((i) => i.id !== 'ledger').length > 0,
                }));
              },
              onPushToDrive: async () => {
                try {
                  await FinanceStorageService.syncLedgerToDrive(result.accessToken, currentLocalLedger, existingLedgerFile?.id);
                  const updatedFiles = await FinanceStorageService.fetchDriveFiles(result.accessToken);
                  setDriveFiles(updatedFiles);
                  showToast('Uploaded local savings ledger to Google Drive!', 'success');
                  setConflictModalState((prev) => ({
                    ...prev,
                    items: prev.items.filter((i) => i.id !== 'ledger'),
                    isOpen: prev.items.filter((i) => i.id !== 'ledger').length > 0,
                  }));
                } catch (err: any) {
                  showToast(`Upload failed: ${err.message}`, 'error');
                }
              },
            });
          }
        }
      }

      // Check results: DO NOT overwrite local changes silently!
      if (conflictItems.length > 0) {
        setConflictModalState({
          isOpen: true,
          items: conflictItems,
        });

        const allLocalNewer = conflictItems.every((i) => i.status === 'local_newer');
        if (allLocalNewer) {
          showToast(`Connected to Drive! Local changes are newer and were preserved.`, 'info');
        } else {
          showToast(`Connected to Drive. Review cloud file differences.`, 'info');
        }
      } else {
        showToast(`Connected to Google Drive as ${result.user.email}`);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/user-cancelled' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setDriveStatus((prev) => ({ ...prev, isSyncing: false }));
        return;
      }
      console.warn('Sign in note:', err);
      setDriveStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Google sign-in was aborted',
      }));
      showToast(err.message || 'Failed to authenticate with Google', 'error');
    }
  };

  const handleKeepAllLocal = () => {
    setConflictModalState({ isOpen: false, items: [] });
    showToast('Preserved all local changes on this device.', 'info');
  };

  const handlePushAllLocalToDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleSessionExpired('Google Drive session expired. Please sign in again to sync your files.');
      return;
    }
    try {
      setDriveStatus((p) => ({ ...p, isSyncing: true }));
      const currentLocalBudget = FinanceStorageService.loadLocalBudget(currentYear);
      const currentLocalLedger = FinanceStorageService.loadLocalSavingsLedger();
      await FinanceStorageService.syncBudgetToDrive(token, currentLocalBudget);
      await FinanceStorageService.syncLedgerToDrive(token, currentLocalLedger);
      const files = await FinanceStorageService.fetchDriveFiles(token);
      setDriveFiles(files);
      setDriveStatus((p) => ({
        ...p,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString(),
      }));
      setConflictModalState({ isOpen: false, items: [] });
      showToast('Uploaded latest local budget and ledger to Google Drive!', 'success');
    } catch (err: any) {
      if (isSessionExpiredError(err)) {
        handleSessionExpired('Google Drive session expired while uploading. Please sign in again.');
        return;
      }
      setDriveStatus((p) => ({ ...p, isSyncing: false, error: err.message }));
      showToast(`Upload failed: ${err.message}`, 'error');
    }
  };

  const handleOverwriteAllWithDrive = () => {
    conflictModalState.items.forEach((item) => item.onOverwriteWithDrive());
    setConflictModalState({ isOpen: false, items: [] });
  };

  const handleSignOut = async () => {
    await logout();
    setDriveStatus((prev) => ({
      ...prev,
      isSignedIn: false,
      userEmail: null,
      userName: null,
      userPhoto: null,
    }));
    showToast('Signed out of Google Drive', 'info');
  };

  // Switch year safely without overwriting newer local edits
  const handleSelectYear = async (year: number) => {
    setCurrentYear(year);
    const loadedBudget = FinanceStorageService.loadLocalBudget(year);
    setBudget(loadedBudget);

    // If signed into Google Drive, verify version safely
    const token = await getAccessToken();
    if (token) {
      try {
        const driveRes = await FinanceStorageService.fetchBudgetFromDrive(token, year);
        if (driveRes) {
          const timestampStatus = FinanceStorageService.compareTimestamps(
            loadedBudget.lastUpdated,
            driveRes.budget.lastUpdated || driveRes.file.modifiedTime
          );

          const isIdentical =
            JSON.stringify(loadedBudget.entries) === JSON.stringify(driveRes.budget.entries) &&
            loadedBudget.budgets?.length === driveRes.budget.budgets?.length;

          if (isIdentical) {
            return;
          }

          if (timestampStatus === 'local_newer' && loadedBudget.entries.length > 0) {
            // Local is newer: DO NOT overwrite!
            showToast(`Opened ${year} budget (Local version is newer than Drive and was kept).`, 'info');
          } else if (loadedBudget.entries.length === 0 && driveRes.budget.entries.length > 0) {
            // Local is empty, Drive has data: confirm before restoring
            setConfirmationModal({
              isOpen: true,
              title: `Restore ${year} Budget from Google Drive?`,
              description: `Found a Google Drive cloud backup for ${year} with ${driveRes.budget.entries.length} entries. Would you like to load it into your local storage?`,
              affectedItems: [getBudgetFileName(year)],
              confirmLabel: 'Load from Google Drive',
              onConfirm: async () => {
                FinanceStorageService.saveLocalBudget(driveRes.budget);
                setBudget(driveRes.budget);
                showToast(`Loaded ${year} budget from Google Drive`, 'success');
                setConfirmationModal((m) => ({ ...m, isOpen: false }));
              },
            });
          } else {
            // Drive has differences: prompt before overwriting local!
            setConfirmationModal({
              isOpen: true,
              title: `Google Drive Version Available for ${year}`,
              description: `Google Drive has a cloud version of ${year} budget (${driveRes.budget.entries.length} entries). Overwrite your current local data?`,
              affectedItems: [getBudgetFileName(year)],
              confirmLabel: 'Overwrite Local with Drive',
              isDestructive: true,
              onConfirm: async () => {
                FinanceStorageService.saveLocalBudget(driveRes.budget);
                setBudget(driveRes.budget);
                showToast(`Loaded ${year} budget from Google Drive`, 'success');
                setConfirmationModal((m) => ({ ...m, isOpen: false }));
              },
            });
          }
        }
      } catch (err) {
        console.warn('Could not check year from Drive:', err);
      }
    }
  };

  // Create new year
  const handleAddNewYear = () => {
    const nextDefaultYear = Math.max(...availableYears, new Date().getFullYear()) + 1;
    const yearInput = window.prompt('Enter new budget year to initialize:', String(nextDefaultYear));
    if (!yearInput) return;

    const parsedYear = parseInt(yearInput.trim(), 10);
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      alert('Please enter a valid 4-digit year (e.g. 2027).');
      return;
    }

    FinanceStorageService.registerKnownYear(parsedYear);
    setAvailableYears(FinanceStorageService.getKnownYears());
    handleSelectYear(parsedYear);
    showToast(`Initialized brand new database for year ${parsedYear}`);
  };

  // Add Budget Entry
  const handleAddBudgetEntry = (entryData: Omit<BudgetEntry, 'id' | 'createdAt'>) => {
    const newEntry: BudgetEntry = {
      ...entryData,
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedBudget: YearBudgetData = {
      ...budget,
      entries: [newEntry, ...budget.entries],
    };

    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);

    // If saving entry: accumulate in the separate Savings Ledger!
    if (newEntry.type === 'saving') {
      const updatedLedger = FinanceStorageService.accumulateBudgetSavingToLedger(newEntry, false);
      setLedger(updatedLedger);
      showToast(`Savings accumulated: +₱${newEntry.amount} transferred to ${newEntry.savingAccountName || 'Savings Ledger'}`);
    } else {
      showToast(`Recorded ${newEntry.type}: ₱${newEntry.amount}`);
    }
  };

  // Update Budget Entry
  const handleUpdateBudgetEntry = (entryId: string, updated: Partial<BudgetEntry>) => {
    const updatedEntries = budget.entries.map((e) => {
      if (e.id === entryId) {
        return { ...e, ...updated };
      }
      return e;
    });

    const updatedBudget: YearBudgetData = {
      ...budget,
      entries: updatedEntries,
    };

    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);

    const target = updatedEntries.find((e) => e.id === entryId);
    if (target?.type === 'saving') {
      const updatedLedger = FinanceStorageService.accumulateBudgetSavingToLedger(target, false);
      setLedger(updatedLedger);
    }

    showToast(`Updated entry: ${target?.item || target?.description || 'Item'}`);
  };

  // Delete Budget Entry
  const handleDeleteBudgetEntry = (entryId: string) => {
    const entry = budget.entries.find((e) => e.id === entryId);
    if (!entry) return;

    const updatedEntries = budget.entries.filter((e) => e.id !== entryId);
    const updatedBudget: YearBudgetData = {
      ...budget,
      entries: updatedEntries,
    };

    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);

    // If it was a saving entry, roll back from Savings Ledger
    if (entry.type === 'saving') {
      const updatedLedger = FinanceStorageService.accumulateBudgetSavingToLedger(entry, true);
      setLedger(updatedLedger);
      showToast(`Removed saving entry and updated savings ledger`);
    } else {
      showToast(`Deleted ${entry.type} entry`);
    }
  };

  // Add direct ledger transaction (yield, deposit, withdrawal, transfer)
  const handleAddLedgerTransaction = (txData: Omit<SavingsTransaction, 'id' | 'runningTotalCapital'>) => {
    const currentLedger = FinanceStorageService.loadLocalSavingsLedger();
    const newTx: SavingsTransaction = {
      ...txData,
      id: `tx-manual-${Date.now()}`,
    };

    currentLedger.transactions.push(newTx);
    const currSym = currentLedger.currency || '₱';

    if (txData.source === 'withdrawal') {
      const acc = currentLedger.accounts.find((a) => a.id === txData.accountId);
      if (acc) {
        acc.balance = Math.max(0, acc.balance - txData.amount);
      }
      FinanceStorageService.saveLocalSavingsLedger(currentLedger);
      setLedger({ ...currentLedger });
      showToast(`Recorded withdrawal of ${currSym}${txData.amount.toLocaleString()} from ${acc?.name || 'account'}`);
    } else if (txData.source === 'transfer') {
      const fromAcc = currentLedger.accounts.find((a) => a.id === txData.accountId);
      const toAcc = currentLedger.accounts.find((a) => a.id === txData.toAccountId);
      if (fromAcc) {
        fromAcc.balance = Math.max(0, fromAcc.balance - txData.amount);
      }
      if (toAcc) {
        toAcc.balance += txData.amount;
      }
      FinanceStorageService.saveLocalSavingsLedger(currentLedger);
      setLedger({ ...currentLedger });
      showToast(
        `Transferred ${currSym}${txData.amount.toLocaleString()} from ${fromAcc?.name || 'account'} to ${toAcc?.name || 'account'}`
      );
    } else {
      const acc = currentLedger.accounts.find((a) => a.id === txData.accountId);
      if (acc) {
        acc.balance += txData.amount;
      }
      FinanceStorageService.saveLocalSavingsLedger(currentLedger);
      setLedger({ ...currentLedger });
      showToast(
        `Recorded ${txData.source === 'interest_yield' ? 'interest payout' : 'deposit'} of ${currSym}${txData.amount.toLocaleString()} to ${acc?.name || 'account'}`
      );
    }
  };

  // Add new account to savings ledger
  const handleAddSavingsAccount = (accountData: Omit<SavingsAccount, 'id'>) => {
    const currentLedger = FinanceStorageService.loadLocalSavingsLedger();
    const newAccount: SavingsAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
    };

    currentLedger.accounts.push(newAccount);
    FinanceStorageService.saveLocalSavingsLedger(currentLedger);
    setLedger({ ...currentLedger });
    showToast(`Added account "${newAccount.name}"`);
  };

  // Update/Rename account in savings ledger
  const handleUpdateSavingsAccount = (accountId: string, updates: Partial<SavingsAccount>) => {
    const currentLedger = FinanceStorageService.loadLocalSavingsLedger();
    const accIndex = currentLedger.accounts.findIndex((a) => a.id === accountId);
    if (accIndex === -1) return;

    const oldName = currentLedger.accounts[accIndex].name;
    const newName = updates.name?.trim() || oldName;

    currentLedger.accounts[accIndex] = {
      ...currentLedger.accounts[accIndex],
      ...updates,
      name: newName,
    };

    // If name changed, update transaction accountName for consistency
    if (updates.name && updates.name.trim() !== oldName) {
      currentLedger.transactions.forEach((tx) => {
        if (tx.accountId === accountId) {
          tx.accountName = newName;
        }
      });

      // Also update in current budget entries if savingAccountId matches
      const currentBudget = FinanceStorageService.loadLocalBudget(budget.year);
      let budgetUpdated = false;
      currentBudget.entries.forEach((e) => {
        if (e.savingAccountId === accountId) {
          e.savingAccountName = newName;
          budgetUpdated = true;
        }
      });
      if (budgetUpdated) {
        FinanceStorageService.saveLocalBudget(currentBudget);
        setBudget({ ...currentBudget });
      }
    }

    FinanceStorageService.saveLocalSavingsLedger(currentLedger);
    setLedger({ ...currentLedger });
    showToast(`Updated account "${newName}"`);
  };

  // Delete account from savings ledger
  const handleDeleteSavingsAccount = (accountId: string, reassignToAccountId?: string) => {
    const currentLedger = FinanceStorageService.loadLocalSavingsLedger();
    if (currentLedger.accounts.length <= 1) {
      showToast('Cannot delete the last remaining savings account');
      return;
    }

    const deletingAcc = currentLedger.accounts.find((a) => a.id === accountId);
    if (!deletingAcc) return;

    const targetAcc = reassignToAccountId
      ? currentLedger.accounts.find((a) => a.id === reassignToAccountId)
      : currentLedger.accounts.find((a) => a.id !== accountId);

    // Reassign transactions if target account is found
    if (targetAcc) {
      currentLedger.transactions.forEach((tx) => {
        if (tx.accountId === accountId) {
          tx.accountId = targetAcc.id;
          tx.accountName = targetAcc.name;
        }
      });
      // Transfer balance
      targetAcc.balance += deletingAcc.balance;
    }

    // Also update budget entries pointing to this account
    const currentBudget = FinanceStorageService.loadLocalBudget(budget.year);
    let budgetUpdated = false;
    currentBudget.entries.forEach((e) => {
      if (e.savingAccountId === accountId) {
        if (targetAcc) {
          e.savingAccountId = targetAcc.id;
          e.savingAccountName = targetAcc.name;
        } else {
          delete e.savingAccountId;
          delete e.savingAccountName;
        }
        budgetUpdated = true;
      }
    });
    if (budgetUpdated) {
      FinanceStorageService.saveLocalBudget(currentBudget);
      setBudget({ ...currentBudget });
    }

    // Remove account
    currentLedger.accounts = currentLedger.accounts.filter((a) => a.id !== accountId);
    FinanceStorageService.saveLocalSavingsLedger(currentLedger);
    setLedger({ ...currentLedger });
    showToast(`Deleted account "${deletingAcc.name}"${targetAcc ? ` (transferred to ${targetAcc.name})` : ''}`);
  };

  // Update Custom Categories
  const handleUpdateCategories = (customCats: {
    expense: string[];
    income: string[];
    saving: string[];
  }) => {
    const updatedBudget: YearBudgetData = {
      ...budget,
      customCategories: customCats,
      lastUpdated: new Date().toISOString(),
    };
    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);
    showToast('Categories updated successfully');
  };

  // Update Item Templates / Estimated Budgets
  const handleUpdateTemplates = (templates: BudgetItemTemplate[]) => {
    const updatedBudget: YearBudgetData = {
      ...budget,
      itemTemplates: templates,
      lastUpdated: new Date().toISOString(),
    };
    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);
    showToast('Estimated budget templates updated');
  };

  // Add multiple entries (e.g. pre-populate period from estimated budgets)
  const handleAddMultipleBudgetEntries = (entriesData: Omit<BudgetEntry, 'id' | 'createdAt'>[]) => {
    const newEntries: BudgetEntry[] = entriesData.map((e, idx) => ({
      ...e,
      id: `entry-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));

    const updatedBudget: YearBudgetData = {
      ...budget,
      entries: [...newEntries, ...budget.entries],
      lastUpdated: new Date().toISOString(),
    };

    setBudget(updatedBudget);
    FinanceStorageService.saveLocalBudget(updatedBudget);

    // Sync any saving entries to ledger
    let updatedLedger = ledger;
    newEntries.forEach((entry) => {
      if (entry.type === 'saving') {
        updatedLedger = FinanceStorageService.accumulateBudgetSavingToLedger(entry, false);
      }
    });
    setLedger({ ...updatedLedger });
    showToast(`Added ${newEntries.length} items with estimated amounts to period`);
  };

  // Reset all data for live production
  const handleResetDataForGoLive = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Reset All Data for Go Live?',
      description: 'This will wipe all test budget records and savings transactions, setting all balances to ₱0 in preparation for live production. Categories, payment methods, and item templates will be preserved.',
      affectedItems: [
        'All recorded budget entries across all years (cleared to empty)',
        'All savings ledger transactions (cleared to empty)',
        'All savings account balances (reset to ₱0)',
        'Initial capital (reset to ₱0)',
        'Local storage cache (reset to clean production state)',
      ],
      confirmLabel: 'Yes, Clean All Data',
      isDestructive: true,
      onConfirm: async () => {
        const { budget: cleanBudget, ledger: cleanLedger } = FinanceStorageService.resetAllDataForGoLive();
        setBudget(cleanBudget);
        setLedger(cleanLedger);
        setCurrentYear(2026);
        setAvailableYears([2026]);
        showToast('All data has been cleaned and reset for Go Live!', 'success');
      },
    });
  };

  // Workspace-compliant Google Drive Save / Update actions
  const triggerSaveBudgetToDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleSessionExpired('Google Drive session expired. Please sign in again.');
      return;
    }

    const fileName = getBudgetFileName(budget.year);
    setConfirmationModal({
      isOpen: true,
      title: `Update Google Drive File`,
      description: `Save and synchronize the ${budget.year} budget data to your Google Drive? This will create or update the annual database file.`,
      affectedItems: [fileName],
      confirmLabel: 'Save to Google Drive',
      onConfirm: async () => {
        try {
          setDriveStatus((p) => ({ ...p, isSyncing: true }));
          const res = await FinanceStorageService.syncBudgetToDrive(token, budget);
          const files = await FinanceStorageService.fetchDriveFiles(token);
          setDriveFiles(files);
          setDriveStatus((p) => ({
            ...p,
            isSyncing: false,
            lastSyncedAt: new Date().toLocaleTimeString(),
            budgetFileId: res.fileId,
          }));
          showToast(`Successfully saved ${fileName} to Google Drive!`);
        } catch (err: any) {
          if (isSessionExpiredError(err)) {
            handleSessionExpired('Google Drive session expired while saving budget. Please sign in again.');
            return;
          }
          setDriveStatus((p) => ({ ...p, isSyncing: false, error: err.message }));
          showToast(`Error saving to Drive: ${err.message}`, 'error');
        } finally {
          setConfirmationModal((m) => ({ ...m, isOpen: false }));
        }
      },
    });
  };

  const triggerSaveLedgerToDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleSessionExpired('Google Drive session expired. Please sign in again.');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: `Update Savings Ledger in Google Drive`,
      description: `Save your multi-year capital ledger and account balances to your Google Drive?`,
      affectedItems: [SAVINGS_LEDGER_FILE_NAME],
      confirmLabel: 'Save Ledger to Google Drive',
      onConfirm: async () => {
        try {
          setDriveStatus((p) => ({ ...p, isSyncing: true }));
          const res = await FinanceStorageService.syncLedgerToDrive(token, ledger);
          const files = await FinanceStorageService.fetchDriveFiles(token);
          setDriveFiles(files);
          setDriveStatus((p) => ({
            ...p,
            isSyncing: false,
            lastSyncedAt: new Date().toLocaleTimeString(),
            savingsFileId: res.fileId,
          }));
          showToast(`Successfully saved ${SAVINGS_LEDGER_FILE_NAME} to Google Drive!`);
        } catch (err: any) {
          if (isSessionExpiredError(err)) {
            handleSessionExpired('Google Drive session expired while saving ledger. Please sign in again.');
            return;
          }
          setDriveStatus((p) => ({ ...p, isSyncing: false, error: err.message }));
          showToast(`Error saving ledger: ${err.message}`, 'error');
        } finally {
          setConfirmationModal((m) => ({ ...m, isOpen: false }));
        }
      },
    });
  };

  const triggerSyncAll = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleSessionExpired('Google Drive session expired. Please sign in again.');
      return;
    }

    const budgetFileName = getBudgetFileName(budget.year);
    setConfirmationModal({
      isOpen: true,
      title: 'Sync All Financial Data to Google Drive',
      description: `You are about to synchronize both your ${budget.year} budget and your permanent savings ledger to Google Drive.`,
      affectedItems: [budgetFileName, SAVINGS_LEDGER_FILE_NAME],
      confirmLabel: 'Sync All Files Now',
      onConfirm: async () => {
        try {
          setDriveStatus((p) => ({ ...p, isSyncing: true }));
          await FinanceStorageService.syncBudgetToDrive(token, budget);
          await FinanceStorageService.syncLedgerToDrive(token, ledger);
          const files = await FinanceStorageService.fetchDriveFiles(token);
          setDriveFiles(files);
          setDriveStatus((p) => ({
            ...p,
            isSyncing: false,
            lastSyncedAt: new Date().toLocaleTimeString(),
          }));
          showToast(`Synced ${budgetFileName} and ${SAVINGS_LEDGER_FILE_NAME} to Google Drive!`);
        } catch (err: any) {
          if (isSessionExpiredError(err)) {
            handleSessionExpired('Google Drive session expired while syncing. Please sign in again.');
            return;
          }
          setDriveStatus((p) => ({ ...p, isSyncing: false, error: err.message }));
          showToast(`Sync failed: ${err.message}`, 'error');
        } finally {
          setConfirmationModal((m) => ({ ...m, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold text-white ${
              toastMessage.type === 'error'
                ? 'bg-rose-600'
                : toastMessage.type === 'info'
                ? 'bg-slate-800'
                : 'bg-emerald-600'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        description={confirmationModal.description}
        affectedItems={confirmationModal.affectedItems}
        confirmLabel={confirmationModal.confirmLabel}
        isDestructive={confirmationModal.isDestructive}
        isLoading={driveStatus.isSyncing}
        onConfirm={confirmationModal.onConfirm}
        onCancel={() => setConfirmationModal((m) => ({ ...m, isOpen: false }))}
      />

      {/* Drive Reconnection Conflict / Overwrite Prevention Modal */}
      <DriveConflictModal
        isOpen={conflictModalState.isOpen}
        onClose={handleKeepAllLocal}
        userEmail={driveStatus.userEmail}
        items={conflictModalState.items}
        onKeepAllLocal={handleKeepAllLocal}
        onPushAllLocalToDrive={handlePushAllLocalToDrive}
        onOverwriteAllWithDrive={handleOverwriteAllWithDrive}
        isLoading={driveStatus.isSyncing}
      />

      {/* Main Header */}
      <Header
        currentYear={currentYear}
        availableYears={availableYears}
        onSelectYear={handleSelectYear}
        onAddNewYear={handleAddNewYear}
        frequency={frequency}
        onChangeFrequency={setFrequency}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        driveStatus={driveStatus}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        onOpenDriveModal={() => setActiveTab('drive')}
        onTriggerSync={triggerSyncAll}
      />

      {/* Body Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            budget={budget}
            ledger={ledger}
            frequency={frequency}
            onNavigateToSavings={() => setActiveTab('savings')}
            onNavigateToBudget={() => setActiveTab('budget')}
            onNavigateToDrive={() => setActiveTab('drive')}
            currencySymbol="₱"
          />
        )}

        {activeTab === 'budget' && (
          <BudgetEntryView
            budget={budget}
            accounts={ledger.accounts}
            frequency={frequency}
            onChangeFrequency={setFrequency}
            onAddEntry={handleAddBudgetEntry}
            onAddMultipleEntries={handleAddMultipleBudgetEntries}
            onUpdateEntry={handleUpdateBudgetEntry}
            onDeleteEntry={handleDeleteBudgetEntry}
            onUpdateCategories={handleUpdateCategories}
            onUpdateTemplates={handleUpdateTemplates}
            currencySymbol="₱"
          />
        )}

        {activeTab === 'savings' && (
          <SavingsLedgerView
            ledger={ledger}
            onAddTransaction={handleAddLedgerTransaction}
            onAddAccount={handleAddSavingsAccount}
            onUpdateAccount={handleUpdateSavingsAccount}
            onDeleteAccount={handleDeleteSavingsAccount}
            currencySymbol="₱"
          />
        )}

        {activeTab === 'drive' && (
          <DriveFilesManagerView
            driveStatus={driveStatus}
            currentYear={currentYear}
            budget={budget}
            ledger={ledger}
            driveFiles={driveFiles}
            onSignIn={handleSignInWithGoogle}
            onSyncAll={triggerSyncAll}
            onPullBudget={async (yr) => {
              const token = await getAccessToken();
              if (!token) return;
              try {
                const driveRes = await FinanceStorageService.fetchBudgetFromDrive(token, yr);
                if (!driveRes) {
                  showToast(`No file found in Drive for year ${yr}`, 'info');
                  return;
                }
                const currentLocal = FinanceStorageService.loadLocalBudget(yr);
                const status = FinanceStorageService.compareTimestamps(
                  currentLocal.lastUpdated,
                  driveRes.budget.lastUpdated || driveRes.file.modifiedTime
                );
                const localIsNewer = status === 'local_newer' && currentLocal.entries.length > 0;

                setConfirmationModal({
                  isOpen: true,
                  title: `Overwrite Local ${yr} Budget with Google Drive?`,
                  description: localIsNewer
                    ? `Warning: Your local ${yr} budget has NEWER edits than Google Drive. Overwriting will permanently discard your local changes in favor of the Drive cloud version (${driveRes.budget.entries.length} entries).`
                    : `Load ${yr} budget from Google Drive (${driveRes.budget.entries.length} entries)? This will replace your local device copy.`,
                  affectedItems: [getBudgetFileName(yr)],
                  confirmLabel: 'Yes, Overwrite Local',
                  isDestructive: localIsNewer,
                  onConfirm: async () => {
                    FinanceStorageService.saveLocalBudget(driveRes.budget);
                    setBudget(driveRes.budget);
                    showToast(`Updated ${yr} budget from Google Drive`, 'success');
                    setConfirmationModal((m) => ({ ...m, isOpen: false }));
                  },
                });
              } catch (err: any) {
                showToast(`Failed to pull from Drive: ${err.message}`, 'error');
              }
            }}
            onPullLedger={async () => {
              const token = await getAccessToken();
              if (!token) return;
              try {
                const driveRes = await FinanceStorageService.fetchLedgerFromDrive(token);
                if (!driveRes) {
                  showToast('No savings ledger file found in Drive', 'info');
                  return;
                }
                const currentLocalLedger = FinanceStorageService.loadLocalSavingsLedger();
                const status = FinanceStorageService.compareTimestamps(
                  currentLocalLedger.lastUpdated,
                  driveRes.ledger.lastUpdated || driveRes.file.modifiedTime
                );
                const localIsNewer = status === 'local_newer' && currentLocalLedger.transactions.length > 0;

                setConfirmationModal({
                  isOpen: true,
                  title: 'Overwrite Local Savings Ledger with Google Drive?',
                  description: localIsNewer
                    ? `Warning: Your local savings ledger has NEWER edits than Google Drive. Overwriting will replace your local transactions (${currentLocalLedger.transactions.length}) with the cloud copy (${driveRes.ledger.transactions.length}).`
                    : `Load savings ledger from Google Drive (${driveRes.ledger.transactions.length} transactions)? This will replace your local device copy.`,
                  affectedItems: [SAVINGS_LEDGER_FILE_NAME],
                  confirmLabel: 'Yes, Overwrite Local',
                  isDestructive: localIsNewer,
                  onConfirm: async () => {
                    FinanceStorageService.saveLocalSavingsLedger(driveRes.ledger);
                    setLedger(driveRes.ledger);
                    showToast('Updated savings ledger from Google Drive', 'success');
                    setConfirmationModal((m) => ({ ...m, isOpen: false }));
                  },
                });
              } catch (err: any) {
                showToast(`Failed to pull ledger: ${err.message}`, 'error');
              }
            }}
            onSaveBudgetToDrive={triggerSaveBudgetToDrive}
            onSaveLedgerToDrive={triggerSaveLedgerToDrive}
            onAddNewYear={handleAddNewYear}
            onSelectYear={handleSelectYear}
            onImportBudgetJson={(jsonData) => {
              FinanceStorageService.saveLocalBudget(jsonData);
              FinanceStorageService.registerKnownYear(jsonData.year);
              setAvailableYears(FinanceStorageService.getKnownYears());
              setBudget(jsonData);
              setCurrentYear(jsonData.year);
              showToast(`Imported budget for year ${jsonData.year}`);
            }}
            onResetDataForGoLive={handleResetDataForGoLive}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">CapitalFlow</span>
            <span>&bull;</span>
            <span>Google Drive JSON Database Architecture</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Year Database: capitalflow_budget_{currentYear}.json &bull; Ledger: capitalflow_savings_ledger.json
          </div>
        </div>
      </footer>

    </div>
  );
}
