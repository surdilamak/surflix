/**
 * Toast / Snackbar — iOS-style notification at top of screen
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './icons';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  open: boolean;
  onClose: () => void;
}

export function Toast({ message, variant = 'success', open, onClose }: ToastProps) {
  const variantStyles = {
    success: { color: 'text-ios-green', icon: Icons.CheckCircle2 },
    error: { color: 'text-ios-red', icon: Icons.XCircle },
    info: { color: 'text-ios-blue', icon: Icons.Info },
  };

  const { color, icon: Icon } = variantStyles[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-1/2 top-4 z-[200] -translate-x-1/2"
          style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-full border border-white/10 bg-bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-ios"
          >
            <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
            <span className="text-[13px] font-medium text-white">{message}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
