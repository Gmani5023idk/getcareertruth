'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Globe, 
  RotateCw, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Zap,
  RotateCcw,
  Check
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// --- Types & Initial Data ---

const ICON_MAP: Record<string, any> = {
  Smartphone,
  Globe,
  RotateCw,
  Wifi,
};

interface TestItem {
  id: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
}

interface TestSection {
  title: string;
  iconName: 'Smartphone' | 'Globe' | 'RotateCw' | 'Wifi';
  items: TestItem[];
}

const INITIAL_DATA: TestSection[] = [
  {
    title: 'Device Testing',
    iconName: 'Smartphone',
    items: [
      { id: 'dev-1', label: 'iPhone SE (375px)', status: 'PENDING' },
      { id: 'dev-2', label: 'iPhone 12 Pro (390px)', status: 'PENDING' },
      { id: 'dev-3', label: 'iPhone 14 Pro Max (430px)', status: 'PENDING' },
      { id: 'dev-4', label: 'Samsung Galaxy S21 (360px)', status: 'PENDING' },
      { id: 'dev-5', label: 'iPad (768px)', status: 'PENDING' },
      { id: 'dev-6', label: 'iPad Pro (1024px)', status: 'PENDING' },
    ]
  },
  {
    title: 'Browser Testing',
    iconName: 'Globe',
    items: [
      { id: 'br-1', label: 'Safari iOS', status: 'PENDING' },
      { id: 'br-2', label: 'Chrome Android', status: 'PENDING' },
      { id: 'br-3', label: 'Firefox Android', status: 'PENDING' },
      { id: 'br-4', label: 'Samsung Internet', status: 'PENDING' },
    ]
  },
  {
    title: 'Orientation Testing',
    iconName: 'RotateCw',
    items: [
      { id: 'or-1', label: 'Portrait Mode (Fixed)', status: 'PENDING' },
      { id: 'or-2', label: 'Landscape Mode (Scroll)', status: 'PENDING' },
      { id: 'or-3', label: 'Rotation UI Handling', status: 'PENDING' },
    ]
  },
  {
    title: 'Network Testing',
    iconName: 'Wifi',
    items: [
      { id: 'net-1', label: '3G Latency (FCP < 1.5s)', status: 'PENDING' },
      { id: 'net-2', label: '4G Smooth Interaction', status: 'PENDING' },
      { id: 'net-3', label: 'WiFi High Fidelity', status: 'PENDING' },
      { id: 'net-4', label: 'Offline Mode Cache', status: 'PENDING' },
    ]
  }
];

// --- Main Page ---

export default function QADashboard() {
  const [sections, setSections] = useState<TestSection[]>(INITIAL_DATA);
  const [mounted, setHydrated] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('gct-qa-checklist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validated = parsed.map((section: any) => {
          let iconName = section.iconName;
          if (!iconName) {
            if (section.title === 'Device Testing') iconName = 'Smartphone';
            else if (section.title === 'Browser Testing') iconName = 'Globe';
            else if (section.title === 'Orientation Testing') iconName = 'RotateCw';
            else if (section.title === 'Network Testing') iconName = 'Wifi';
          }
          return {
            title: section.title,
            iconName: iconName || 'Smartphone',
            items: section.items || []
          };
        });
        setSections(validated);
      } catch (e) {
        console.error('Failed to parse saved QA state, falling back to defaults', e);
        setSections(INITIAL_DATA);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('gct-qa-checklist', JSON.stringify(sections));
    }
  }, [sections, mounted]);

  const toggleStatus = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...sections];
    const current = newSections[sectionIndex].items[itemIndex].status;
    const next: any = current === 'PENDING' ? 'PASS' : current === 'PASS' ? 'FAIL' : 'PENDING';
    newSections[sectionIndex].items[itemIndex].status = next;
    setSections(newSections);
  };

  const markAllPass = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items.map(item => ({ ...item, status: 'PASS' }));
    setSections(newSections);
  };

  const resetAll = () => {
    if (confirm('Clear all QA progress?')) {
      setSections(INITIAL_DATA);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(sections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GCT_QA_Report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Stats Calculation
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    sections.forEach(s => {
      s.items.forEach(i => {
        total++;
        if (i.status !== 'PENDING') completed++;
      });
    });
    return { total, completed, percent: Math.round((completed / total) * 100) };
  }, [sections]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-bg text-text-primary p-4 sm:p-12 selection:bg-primary/20">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border pb-10">
           <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-4">
                 <Zap className="w-3.5 h-3.5 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary">Internal QA Matrix</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-text-primary tracking-tight">Cross-Platform <span className="text-primary italic">Validation</span></h1>
              <p className="text-text-secondary mt-3 font-medium text-lg max-w-xl opacity-80 uppercase tracking-widest text-xs">Verify GCT mobile responsiveness across all vectors.</p>
           </div>
           <div className="flex gap-4 w-full sm:w-auto">
              <Button variant="secondary" onClick={resetAll} className="flex-1 sm:flex-none h-14 px-8 border-border rounded-2xl group"><RotateCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" /> Reset</Button>
              <Button variant="primary" onClick={exportJSON} className="flex-1 sm:flex-none h-14 px-8 shadow-lg shadow-primary/20 rounded-2xl"><Download className="w-4 h-4 mr-2" /> Export Summary</Button>
           </div>
        </header>

        {/* Global Progress */}
        <Card className="p-8 sm:p-10 shadow-premium border-primary/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="flex justify-between items-center mb-6">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Global Audit Progress</p>
                 <h2 className="text-4xl font-black text-text-primary tracking-tighter">{stats.percent}% <span className="text-lg opacity-40">Complete</span></h2>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Verification Status</p>
                 <p className="text-xs font-bold text-text-secondary uppercase">{stats.completed} / {stats.total} Checks Verified</p>
              </div>
           </div>
           <div className="h-3 w-full bg-surface-2 rounded-full overflow-hidden border border-border shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percent}%` }} className="h-full bg-gradient-to-r from-primary to-accent" />
           </div>
        </Card>

        {/* Testing Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {sections.map((section, sIndex) => {
             const Icon = ICON_MAP[section.iconName] || Smartphone;
             const sectionTotal = section.items.length;
             const sectionDone = section.items.filter(i => i.status !== 'PENDING').length;

             return (
               <Card key={section.title} className="p-0 overflow-hidden shadow-sm hover:border-primary/20 transition-all border-2 border-transparent">
                  <div className="p-6 sm:p-8 bg-surface-2/50 border-b border-border flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-text-primary shadow-sm"><Icon className="w-6 h-6" /></div>
                        <div>
                           <h3 className="text-xl font-black text-text-primary tracking-tight">{section.title}</h3>
                           <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{sectionDone} / {sectionTotal} Pass</p>
                        </div>
                     </div>
                     <button onClick={() => markAllPass(sIndex)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">Mark Section Pass</button>
                  </div>

                  <div className="p-4 sm:p-6 space-y-2">
                     {section.items.map((item, iIndex) => (
                       <button
                         key={item.id}
                         onClick={() => toggleStatus(sIndex, iIndex)}
                         className="w-full h-14 flex items-center justify-between px-4 sm:px-6 rounded-2xl hover:bg-surface-2 transition-all group"
                       >
                          <div className="flex items-center gap-4">
                             <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                               item.status === 'PASS' ? 'bg-success border-success text-white shadow-lg shadow-success/20' : 
                               item.status === 'FAIL' ? 'bg-error border-error text-white shadow-lg shadow-error/20' : 
                               'bg-surface-3 border-border text-transparent group-hover:border-primary/40'
                             }`}>
                                {item.status === 'PASS' ? <Check className="w-4 h-4" /> : item.status === 'FAIL' ? <Check className="w-4 h-4 rotate-45" /> : null}
                             </div>
                             <span className={`text-sm font-bold tracking-tight transition-all ${item.status === 'PENDING' ? 'text-text-secondary' : 'text-text-primary'}`}>{item.label}</span>
                          </div>
                          
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                            item.status === 'PASS' ? 'bg-success/10 text-success border-success/20' : 
                            item.status === 'FAIL' ? 'bg-error/10 text-error border-error/20' : 
                            'bg-surface-3 text-text-muted border-transparent opacity-40'
                          }`}>
                            {item.status}
                          </span>
                       </button>
                     ))}
                  </div>
               </Card>
             );
           })}
        </div>

        {/* Footer Info */}
        <footer className="pt-12 text-center border-t border-border/50 opacity-40 flex flex-col items-center gap-4">
           <div className="flex items-center gap-6">
              <span className="text-[9px] font-black uppercase tracking-widest">Internal QA Protocol v2.4</span>
              <span className="w-1 h-1 rounded-full bg-text-muted"></span>
              <span className="text-[9px] font-black uppercase tracking-widest">Property of GetCareerTruth</span>
           </div>
           <p className="text-[8px] font-bold text-text-muted uppercase max-w-sm leading-relaxed tracking-tighter">This dashboard is for engineering verification and does not represent production user state. Ensure consistent testing on real physical hardware.</p>
        </footer>
      </div>
    </div>
  );
}
