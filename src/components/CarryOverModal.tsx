import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CarryOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  surplus: number;
  fromPeriod: string;
  toPeriod: string;
}

export const CarryOverModal: React.FC<CarryOverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  surplus,
  fromPeriod,
  toPeriod,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full">
        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-lg font-bold">Carry Over Surplus</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Are you sure you want to carry over a surplus of <strong>₱{surplus.toLocaleString()}</strong> from <strong>{fromPeriod}</strong> to <strong>{toPeriod}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs"
          >
            Confirm Carry Over
          </button>
        </div>
      </div>
    </div>
  );
};
