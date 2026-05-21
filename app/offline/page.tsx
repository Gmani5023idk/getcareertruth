'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RotateCcw, BookOpen, User, Calendar, ShieldCheck } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // Small animation or feedback if still offline
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-10">
        <Logo className="mb-10 mx-auto" />
        
        <div className="space-y-4">
          <div className="w-24 h-24 bg-surface-2 rounded-[40px] flex items-center justify-center mx-auto shadow-inner relative group">
             <WifiOff className="w-10 h-10 text-text-muted group-hover:text-primary transition-colors" />
             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-error rounded-full border-4 border-bg animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Signal Lost</h1>
          <p className="text-text-secondary font-medium text-lg leading-relaxed px-4">
            You're currently offline. Check your connection to resume the truth.
          </p>
        </div>

        <Card className="p-8 border-primary/10 bg-surface/50 backdrop-blur-md shadow-premium">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Available Intelligence
           </h3>
           <div className="space-y-4 text-left">
              {[
                { icon: BookOpen, text: 'View loaded transcripts' },
                { icon: User, text: 'Read saved profiles' },
                { icon: Calendar, text: 'Review past history' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-surface-2 rounded-xl border border-border/50 transition-all hover:bg-surface-3">
                   <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <item.icon className="w-4 h-4" />
                   </div>
                   <span className="text-sm font-bold text-text-primary">{item.text}</span>
                </div>
              ))}
           </div>
        </Card>

        <div className="space-y-6 pt-4">
           <Button 
             onClick={handleRetry} 
             className="w-full h-16 text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/20"
           >
             <RotateCcw className="w-4 h-4 mr-2" /> Re-initialize Connection
           </Button>
           <p className="text-[9px] font-black uppercase text-text-muted tracking-[0.2em] opacity-40">
             Auto-restoring when signal returns
           </p>
        </div>
      </div>
    </div>
  );
}
