import React from 'react';
import { AlertTriangle, HardDrive, Trash2, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedItems?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  affectedItems = [],
  confirmLabel = 'Confirm & Proceed',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isDestructive
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <HardDrive className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1">
              <h3
                id="modal-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {description}
              </p>

              {affectedItems.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Targeted Files / Records:
                  </div>
                  <ul className="text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                    {affectedItems.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span className="truncate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition-all flex items-center gap-2 ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20'
              } disabled:opacity-50`}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
