import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GeneralModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

export const GeneralModal: React.FC<GeneralModalProps> = ({ isOpen, title, onClose, maxWidth = 'max-w-xl', children }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl ${maxWidth} w-full p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 max-h-[92vh] overflow-y-auto`}
        >
          <div className="card-header-gradient p-4 rounded-2xl flex items-center justify-between mb-4 shadow-sm text-white">
            <h3 className="text-sm sm:text-base font-extrabold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
