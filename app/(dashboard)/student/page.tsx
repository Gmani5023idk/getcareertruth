'use client';

import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  Star,
  BookOpen,
  TrendingUp,
  ChevronRight,
  Filter,
  LogOut,
  Bell,
  Menu,
  CheckCircle,
  LayoutDashboard,
  Users,
  ShieldCheck,
  X,
  Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

const TranscriptList = lazy(() => import('@/components/transcript/transcript-list'));

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const user = {
    name: session?.user?.name || 'Student',
    avatar: session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
    collegeName: 'Student Profile',
  };

  const navLinks = [
    { label: 'Dashboard', href: '/student', icon: LayoutDashboard, active: true },
    { label: 'Find Mentors', href: '/employees', icon: Users },
    { label: 'My Bookings', href: '/bookings', icon: Calendar },
    { label: 'Insights', onClick: () => setActiveTab('transcripts'), icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-20 sm:pb-0">
      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] sm:hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-surface p-8 shadow-2xl"
            >
               <div className="flex items-center justify-between mb-12">
                  <Logo />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-surface-2 rounded-xl"><X className="w-5 h-5" /></button>
               </div>
               <div className="space-y-4">
                  {navLinks.map((link, i) => (
                    <button 
                      key={i} 
                      onClick={() => { link.onClick?.(); setIsMobileMenuOpen(false); }}
                      className={`w-full h-14 flex items-center gap-4 px-6 rounded-2xl text-base font-black uppercase tracking-widest border-2 transition-all ${link.active ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-2 border-transparent text-text-secondary'}`}
                    >
                       <link.icon className="w-5 h-5" /> {link.label}
                    </button>
                  ))}
               </div>
               <div className="absolute bottom-8 left-8 right-8">
                  <Button variant="danger" className="w-full h-14 font-black uppercase tracking-widest" onClick={() => signOut()}>
                     Terminate Session
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop/Tablet Header */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] sm:h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
               <button onClick={() => setIsMobileMenuOpen(true)} className="sm:hidden p-2 text-text-secondary"><Menu className="w-6 h-6" /></button>
               <Logo />
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link, i) => (
                <Link 
                  key={i} 
                  href={link.href || '#'} 
                  className={`text-xs font-black uppercase tracking-widest transition-all ${link.active ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <button className="p-2 text-text-secondary hover:text-primary relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-surface"></span>
            </button>
            <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface shadow-sm">
              <Image 
                src={user.avatar} 
                alt="User" 
                width={40}
                height={40}
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome */}
        <div className="mb-10 sm:mb-16">
           <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
                Status: <span className="text-primary italic">Active</span>
              </h1>
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-success animate-pulse" />
           </div>
           <p className="text-text-secondary text-sm sm:text-lg font-medium opacity-80 uppercase tracking-widest">
             {user.name.split(' ')[0]}'s Command Center
           </p>
        </div>

        {/* Stats - 2 Column on Mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {[
            { label: 'Upcoming', value: '1', icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Total Hours', value: '0', icon: Clock, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'Network', value: '12', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Saved', value: '4', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <Card key={i} className="p-5 sm:p-8 hover:border-primary/20 transition-all group overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[40px] opacity-20 -mr-4 -mt-4 transition-all group-hover:scale-150`}></div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-sm`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-2xl sm:text-4xl font-black text-text-primary tracking-tighter">{stat.value}</p>
                   <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mt-1">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-10 sm:space-y-16">
            
            {/* Action Selection */}
            <div className="flex p-1.5 bg-surface-2 rounded-2xl w-fit shadow-inner border border-border/50 overflow-x-auto no-scrollbar max-w-full">
              {['overview', 'calls', 'transcripts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 sm:px-8 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-surface shadow-xl text-primary' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'transcripts' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                     Knowledge Bank
                  </h2>
                </div>
                <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>}>
                  {session?.user?.id && <TranscriptList userId={session.user.id} role={(session.user as any).role || 'STUDENT'} />}
                </Suspense>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Highlight Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-black">Next Deployment</h2>
                    <Link href="/bookings" className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20">All Sessions</Link>
                  </div>
                  <Card className="p-0 overflow-hidden shadow-premium border-primary/10 bg-gradient-to-br from-surface to-primary/[0.02]">
                    <div className="flex flex-col sm:flex-row items-stretch">
                       <div className="sm:w-1/3 bg-surface-2/50 flex flex-col items-center justify-center p-8 border-b sm:border-b-0 sm:border-r border-border">
                          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                             <Calendar className="w-8 h-8" />
                          </div>
                          <p className="text-[10px] font-black uppercase text-text-muted mb-1">Incoming Signal</p>
                          <p className="text-sm font-black text-text-primary">Wed, 19 May</p>
                       </div>
                       <div className="flex-1 p-8">
                          <h3 className="text-xl font-black mb-2">Check Your Deployment Status</h3>
                          <p className="text-text-secondary text-sm font-medium mb-8 leading-relaxed max-w-sm">
                             You have 1 confirmed session initializing soon. Review your objectives before the call.
                          </p>
                          <Link href="/bookings">
                            <Button variant="primary" className="w-full sm:w-auto px-8 h-12 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]">
                               Access Mission Briefing
                            </Button>
                          </Link>
                       </div>
                    </div>
                  </Card>
                </section>

                {/* Recommendations */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-black">Elite Operatives</h2>
                    <Link href="/employees" className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20">Recruit Mentors</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {[1,2].map((i) => (
                      <Card key={i} className="p-6 hover:shadow-premium transition-all border-2 border-transparent hover:border-primary/20 group">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-surface-3 animate-pulse border border-border"></div>
                            <div className="flex-1 space-y-1">
                               <div className="h-4 w-2/3 bg-surface-3 rounded animate-pulse"></div>
                               <div className="h-3 w-1/2 bg-surface-3/50 rounded animate-pulse"></div>
                            </div>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t border-border">
                            <div className="h-3 w-1/4 bg-surface-3 rounded animate-pulse"></div>
                            <div className="h-8 w-1/3 bg-primary/10 rounded-lg animate-pulse"></div>
                         </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Sidebar / Bottom Actions on Mobile */}
          <div className="space-y-8 sm:sticky sm:top-28 h-fit">
            <Card className="p-8 sm:p-10 shadow-premium border-primary/5 bg-surface/80 backdrop-blur-xl">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-8">Rapid Response</h3>
               <div className="space-y-4">
                  <Link href="/employees" className="block">
                     <Button variant="secondary" className="w-full h-14 justify-start gap-4 px-6 border-border rounded-2xl group shadow-sm hover:shadow-md transition-all">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform"><Search className="w-4 h-4" /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Find New Mentor</span>
                     </Button>
                  </Link>
                  <Button variant="secondary" className="w-full h-14 justify-start gap-4 px-6 border-border rounded-2xl group shadow-sm hover:shadow-md transition-all">
                     <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:scale-110 transition-transform"><TrendingUp className="w-4 h-4" /></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Career Roadmap</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setActiveTab('transcripts')} className="w-full h-14 justify-start gap-4 px-6 border-border rounded-2xl group shadow-sm hover:shadow-md transition-all">
                     <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:scale-110 transition-transform"><BookOpen className="w-4 h-4" /></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Saved Intelligence</span>
                  </Button>
               </div>
               
               <div className="mt-12 pt-8 border-t border-border/50">
                  <button onClick={() => signOut()} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-error transition-colors w-full px-2">
                     <LogOut className="w-4 h-4" />
                     Sign Out
                  </button>
               </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar Pinned Bottom */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-border z-[90] flex items-center justify-around px-4 shadow-2xl">
         {navLinks.map((link, i) => (
           <button 
             key={i} 
             onClick={() => { if(link.onClick) link.onClick(); else window.location.href=link.href || '#'; }}
             className={`flex flex-col items-center gap-1 p-2 ${link.active ? 'text-primary' : 'text-text-muted'}`}
           >
              <link.icon className={`w-5 h-5 ${link.active ? 'fill-primary/10' : ''}`} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{link.label}</span>
           </button>
         ))}
      </div>
    </div>
  );
}
