import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  FileCode,
  Download,
  Upload,
  Calendar,
  PiggyBank,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import {
  DriveSyncStatus,
  DriveFileInfo,
  YearBudgetData,
  SavingsLedgerData,
} from '../types/finance';
import { getBudgetFileName, SAVINGS_LEDGER_FILE_NAME } from '../services/driveService';

interface DriveFilesManagerViewProps {
  driveStatus: DriveSyncStatus;
  currentYear: number;
  budget: YearBudgetData;
  ledger: SavingsLedgerData;
  driveFiles: DriveFileInfo[];
  onSignIn: () => void;
  onSyncAll: () => void;
  onPullBudget: (year: number) => void;
  onPullLedger: () => void;
  onSaveBudgetToDrive: () => void;
  onSaveLedgerToDrive: () => void;
  onAddNewYear: () => void;
  onSelectYear: (year: number) => void;
  onImportBudgetJson: (jsonData: YearBudgetData) => void;
  onResetDataForGoLive?: () => void;
}

export const DriveFilesManagerView: React.FC<DriveFilesManagerViewProps> = ({
  driveStatus,
  currentYear,
  budget,
  ledger,
  driveFiles,
  onSignIn,
  onSyncAll,
  onPullBudget,
  onPullLedger,
  onSaveBudgetToDrive,
  onSaveLedgerToDrive,
  onAddNewYear,
  onSelectYear,
  onImportBudgetJson,
  onResetDataForGoLive,
}) => {
  const [activeJsonViewer, setActiveJsonViewer] = useState<'budget' | 'ledger' | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const budgetFileName = getBudgetFileName(currentYear);
  const budgetDriveFile = driveFiles.find((f) => f.name === budgetFileName);
  const ledgerDriveFile = driveFiles.find((f) => f.name === SAVINGS_LEDGER_FILE_NAME);

  const handleDownload = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.year && Array.isArray(parsed.entries)) {
          onImportBudgetJson(parsed as YearBudgetData);
        } else {
          alert('Invalid format. File must contain "year" and "entries" array.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Drive Connection Status Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Google Drive Database Storage
                </h2>
                {driveStatus.isSignedIn ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3 h-3" />
                    <span>Not Connected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {driveStatus.isSignedIn
                  ? `Authenticated as ${driveStatus.userName || driveStatus.userEmail}. JSON database files are synced directly to your personal Google Drive.`
                  : 'Connect your Google Drive to enable cloud persistence, automatic yearly JSON file creation, and multi-device access.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {driveStatus.isSignedIn ? (
              <button
                onClick={onSyncAll}
                disabled={driveStatus.isSyncing}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${driveStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>{driveStatus.isSyncing ? 'Syncing to Drive...' : 'Save & Sync All'}</span>
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Database Files Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Annual Budget File */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Annual Budget Database ({currentYear})
                  </h3>
                  <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    {budgetFileName}
                  </code>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600">
                1 Year Only
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Stores all monthly and bi-weekly income, expense, and planned saving entries strictly for the year {currentYear}. When a new year begins, CapitalFlow generates a dedicated JSON file.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Records in File:</span>
                <span className="font-mono font-semibold">{budget.entries.length} entries</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Google Drive Status:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {budgetDriveFile ? 'Present in Google Drive' : 'Cached locally (Sync pending)'}
                </span>
              </div>
              {budgetDriveFile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Drive File ID:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                    {budgetDriveFile.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              onClick={onSaveBudgetToDrive}
              disabled={!driveStatus.isSignedIn || driveStatus.isSyncing}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-center transition-colors"
            >
              Push to Drive
            </button>
            <button
              onClick={() => onPullBudget(currentYear)}
              disabled={!driveStatus.isSignedIn || driveStatus.isSyncing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Pull latest version from Google Drive"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveJsonViewer('budget')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Inspect JSON"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDownload(budget, budgetFileName)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Download local JSON copy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Separate Savings Ledger File */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Separate Savings &amp; Capital Ledger
                  </h3>
                  <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    {SAVINGS_LEDGER_FILE_NAME}
                  </code>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Multi-Year Accumulation
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Maintains the permanent accumulation of savings transferred from all annual budget entries, compound interest yields, and total capital growth over time.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Transactions:</span>
                <span className="font-mono font-semibold">{ledger.transactions.length} transfers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Google Drive Status:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {ledgerDriveFile ? 'Present in Google Drive' : 'Cached locally (Sync pending)'}
                </span>
              </div>
              {ledgerDriveFile && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Drive File ID:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                    {ledgerDriveFile.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              onClick={onSaveLedgerToDrive}
              disabled={!driveStatus.isSignedIn || driveStatus.isSyncing}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-center transition-colors"
            >
              Push to Drive
            </button>
            <button
              onClick={onPullLedger}
              disabled={!driveStatus.isSignedIn || driveStatus.isSyncing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Pull latest version from Google Drive"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveJsonViewer('ledger')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Inspect JSON"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDownload(ledger, SAVINGS_LEDGER_FILE_NAME)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
              title="Download local JSON copy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Discovered Drive Files Table & Multi-Year Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>CapitalFlow Files in Google Drive</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch years to view historical databases or initialize a new year.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddNewYear}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Initialize New Year</span>
            </button>

            <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Database Type</th>
                <th className="py-3 px-4">Drive File ID</th>
                <th className="py-3 px-4">Last Modified in Drive</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {driveFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {driveStatus.isSignedIn
                      ? 'No files found in Google Drive yet. Click "Save & Sync All" above to write your initial annual budget and savings ledger to Drive.'
                      : 'Connect Google Drive to view and synchronize your files.'}
                  </td>
                </tr>
              ) : (
                driveFiles.map((file) => {
                  const yearMatch = file.name.match(/capitalflow_budget_(\d{4})\.json/);
                  const isBudget = Boolean(yearMatch);
                  const fileYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
                  const isCurrentYear = fileYear === currentYear;

                  return (
                    <tr
                      key={file.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isCurrentYear ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {file.name}
                        {isCurrentYear && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-sans font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isBudget ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            Annual Budget ({fileYear})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            Savings Ledger
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {file.id}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isBudget && fileYear && (
                          <button
                            onClick={() => onSelectYear(fileYear)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            Open Year
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Go-Live & Clean Slate Tools */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Go Live Database Preparation
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Ready for Production
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                All test/mock budget records and sample transactions are cleaned. Philippine expense categories, default item templates, and savings accounts are initialized with ₱0 balances ready for real records.
              </p>
            </div>
          </div>

          {onResetDataForGoLive && (
            <button
              onClick={onResetDataForGoLive}
              className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean All Data for Go Live</span>
            </button>
          )}
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {activeJsonViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  JSON Viewer: {activeJsonViewer === 'budget' ? budgetFileName : SAVINGS_LEDGER_FILE_NAME}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(activeJsonViewer === 'budget' ? budget : ledger, null, 2)
                    )
                  }
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
                >
                  {copyFeedback ? 'Copied!' : 'Copy JSON'}
                </button>
                <button
                  onClick={() => setActiveJsonViewer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-xs flex-1 scrollbar-thin">
              <pre>{JSON.stringify(activeJsonViewer === 'budget' ? budget : ledger, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
