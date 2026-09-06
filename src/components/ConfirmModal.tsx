import React, { useEffect } from 'react';
import { AlertTriangle, Database, RotateCcw, Trash2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'emerald';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  state: ConfirmState;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ state, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const isDanger = state.type === 'danger';
  const isEmerald = state.type === 'emerald';
  const isInfo = state.type === 'info';
  const isDeleteAction = state.title.toLowerCase().includes('hapus') || isDanger;

  const iconBg = isDanger
    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
    : isEmerald
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
    : isInfo
    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50';

  const btnBg = isDanger
    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/30 dark:shadow-rose-900/50'
    : isEmerald
    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 dark:shadow-emerald-900/50'
    : isInfo
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/30 dark:shadow-blue-900/50'
    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/30 dark:shadow-amber-900/50';

  const defaultConfirmText = state.confirmText || (isDeleteAction ? 'Ya, Hapus' : 'Ya, Lanjutkan');
  const defaultCancelText = state.cancelText || 'Batal';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        >
          {/* Top subtle glow bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            isDanger ? 'bg-gradient-to-r from-rose-500 to-red-600' :
            isEmerald ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
            isInfo ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
            'bg-gradient-to-r from-amber-500 to-orange-600'
          }`} />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center pt-2">
            <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4 shadow-sm`}>
              {isDeleteAction ? (
                <Trash2 className="w-8 h-8" />
              ) : isDanger ? (
                <AlertTriangle className="w-8 h-8" />
              ) : isEmerald ? (
                <Database className="w-8 h-8" />
              ) : isInfo ? (
                <Info className="w-8 h-8" />
              ) : (
                <RotateCcw className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              {state.title}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {state.message}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
              >
                {defaultCancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  state.onConfirm();
                }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg cursor-pointer flex items-center gap-2 ${btnBg}`}
              >
                {isDeleteAction && <Trash2 className="w-4 h-4" />}
                <span>{defaultConfirmText}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
