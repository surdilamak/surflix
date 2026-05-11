/**
 * Icon component — lucide-react wrapper untuk konsistensi
 * Pakai outline style, line weight konsisten (mirip SF Symbols)
 */
'use client';

import {
  Flame, Library, Search, ListChecks, User, Plus, Check, Clock,
  Download, Info, X, Play, Star, ChevronRight, ChevronDown,
  ChevronLeft, AlertCircle, ExternalLink, LogOut, Mail, Film,
  Tv, Waves, Eye, EyeOff, Bell, MoreHorizontal, Loader2,
  CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft,
} from 'lucide-react';

export const Icons = {
  Flame, Library, Search, ListChecks, User, Plus, Check, Clock,
  Download, Info, X, Play, Star, ChevronRight, ChevronDown,
  ChevronLeft, AlertCircle, ExternalLink, LogOut, Mail, Film,
  Tv, Waves, Eye, EyeOff, Bell, MoreHorizontal, Loader2,
  CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft,
};

export type IconName = keyof typeof Icons;
