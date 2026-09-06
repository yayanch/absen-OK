import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const bgClass =
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-800 text-white';

          const IconComponent =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
              ? XCircle
              : toast.type === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => onRemove(toast.id)}
              className={`${bgClass} p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold pointer-events-auto cursor-pointer`}
            >
              <IconComponent className="w-5 h-5 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
