/**
 * Toast — center horizontal, top-anchored, both mobile & desktop
 *
 * Position: top center via flex container (gak pakai left-1/2 + transform)
 * Animation: slide down from top + fade
 */
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './icons';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  variant = 'success',
  open,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [open, duration, onClose]);

  const icon = {
    success: <Icons.CheckCircle2 className="h-4 w-4 text-ios-green" />,
    error: <Icons.XCircle className="h-4 w-4 text-ios-red" />,
    info: <Icons.Info className="h-4 w-4 text-ios-blue" />,
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full border border-white/10 bg-bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur-ios'
            )}
          >
            {icon}
            <span className="text-[13px] font-medium text-white">{message}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
