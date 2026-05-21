'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Calendar, 
  User,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  // Hide on keyboard open
  useEffect(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => {
        setIsVisible(window.visualViewport!.height >= window.innerHeight * 0.85);
      };
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/employees', icon: Search },
    { label: 'Bookings', href: '/bookings', icon: Calendar },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-[150] sm:hidden bg-surface/80 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-around h-16 px-2">
             {navItems.map((item) => {
               const isActive = pathname === item.href;
               return (
                 <Link 
                   key={item.href} 
                   href={item.href}
                   className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-95 group relative`}
                 >
                   {isActive && (
                      <motion.div 
                        layoutId="activeDot"
                        className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"
                      />
                   )}
                   <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                   <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                     {item.label}
                   </span>
                 </Link>
               );
             })}
          </div>
          {/* Safe Area Inset for iPhone */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
