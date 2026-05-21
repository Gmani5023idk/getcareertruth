'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Home, 
  Users, 
  Calendar, 
  BookOpen, 
  User, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Logo from '@/components/ui/Logo';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const navLinks = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Find Consultants', href: '/employees', icon: Users },
    { label: 'My Bookings', href: '/bookings', icon: Calendar },
    { label: 'Transcripts', href: '/transcripts', icon: BookOpen },
    { label: 'Chat', href: '/chat', icon: MessageSquare },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 w-[280px] bg-bg border-r border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface-2/50">
               <Logo />
               <button 
                 onClick={onClose}
                 className="w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-text-secondary hover:text-primary active:scale-90 transition-all"
                 aria-label="Close menu"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-6 ml-4">Primary Navigation</p>
               {navLinks.map((link) => {
                 const isActive = pathname === link.href;
                 return (
                   <Link
                     key={link.href}
                     href={link.href}
                     onClick={onClose}
                     className={`
                       flex items-center gap-4 h-14 px-4 rounded-2xl transition-all group
                       ${isActive 
                         ? 'bg-primary/10 border-2 border-primary text-primary shadow-sm' 
                         : 'bg-surface/50 border-2 border-transparent text-text-secondary hover:bg-surface hover:text-text-primary'}
                     `}
                   >
                     <div className={`
                       w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110
                       ${isActive ? 'bg-primary text-white' : 'bg-surface-3 text-text-muted'}
                     `}>
                        <link.icon className="w-4 h-4" />
                     </div>
                     <span className="text-sm font-black uppercase tracking-widest flex-1">{link.label}</span>
                     {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                   </Link>
                 );
               })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-surface-2/30 space-y-6">
               <div className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-2xl shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                     <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-text-primary">Verified Access</p>
                     <p className="text-[9px] font-bold text-text-muted">End-to-end encrypted</p>
                  </div>
               </div>

               <button 
                 onClick={() => { signOut(); onClose(); }}
                 className="w-full h-14 flex items-center justify-center gap-3 bg-error/5 text-error rounded-2xl font-black uppercase tracking-widest text-xs border border-error/10 hover:bg-error/10 transition-all active:scale-95"
               >
                 <LogOut className="w-4 h-4" />
                 Initialize Sign Out
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
