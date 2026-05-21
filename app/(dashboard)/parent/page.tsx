'use client';

import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Star,
  BookOpen,
  Users,
  MessageSquare,
  ChevronRight,
  Plus,
  Bell,
  LogOut,
  CheckCircle,
  GraduationCap,
  MessageCircle,
  Menu,
  X,
  LayoutDashboard,
  HeartHandshake,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const TranscriptList = lazy(() => import('@/components/transcript/transcript-list'));

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const user = {
    name: session?.user?.name || 'Suresh Kumar',
    avatar: session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh',
    city: 'New Delhi',
    childStage: 'College',
    childCourse: 'Engineering',
  };

  const navLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, active: activeTab === 'overview', onClick: () => setActiveTab('overview') },
    { label: 'Mentors', icon: Users, href: '/employees' },
    { label: 'Circle', icon: HeartHandshake, href: '/parent-circle' },
    { label: 'Chat', icon: MessageCircle, href: '/chat' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24 sm:pb-0">
      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] sm:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-surface p-8 shadow-2xl">
               <div className="flex items-center justify-between mb-12">
                  <Logo />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-surface-2 rounded-xl"><X className="w-5 h-5" /></button>
               </div>
               <div className="space-y-4">
                  {navLinks.map((link, i) => (
                    <button key={i} onClick={() => { if(link.onClick) link.onClick(); else window.location.href=link.href || '#'; setIsMobileMenuOpen(false); }} className={`w-full h-14 flex items-center gap-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${link.active ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-2 border-transparent text-text-secondary'}`}>
                       <link.icon className="w-5 h-5" /> {link.label}
                    </button>
                  ))}
               </div>
               <div className="absolute bottom-8 left-8 right-8">
                  <button onClick={() => signOut()} className="w-full h-14 rounded-2xl bg-error/10 text-error font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                     <LogOut className="w-4 h-4" /> End Session
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsMobileMenuOpen(true)} className="sm:hidden p-2 text-text-secondary hover:text-primary transition-colors"><Menu className="w-6 h-6" /></button>
            <Logo />
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link, i) => (
                <Link key={i} href={link.href || '#'} className={`text-[10px] font-black uppercase tracking-widest transition-all ${link.active ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>{link.label}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <button className="p-2 text-text-secondary hover:text-primary relative transition-colors"><Bell className="w-5 h-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-surface"></span></button>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Welcome Section */}
        <div className="mb-8 sm:mb-12 lg:mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">Namaste, <span className="text-primary italic">{user.name.split(' ')[0]}</span></h1>
               <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
            </div>
            <p className="text-text-secondary text-sm sm:text-lg font-medium opacity-80 uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Parent of {user.childCourse} Student • {user.city}
            </p>
          </div>
          <Button variant="primary" className="h-14 sm:h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Book for Child
          </Button>
        </div>

        {/* Stats Grid - 2x2 on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          {[
            { label: 'Upcoming', value: '1', icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Settled', value: '4', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Circle', value: '12', icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'Briefs', value: '3', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat, i) => (
            <Card key={i} className="p-6 sm:p-8 border-primary/5 hover:shadow-premium transition-all group overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[40px] opacity-20 -mr-4 -mt-4 group-hover:scale-150 transition-all`}></div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-sm`}><stat.icon className="w-5 h-5" /></div>
                <div>
                   <p className="text-2xl sm:text-4xl font-black text-text-primary tracking-tighter">{stat.value}</p>
                   <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mt-1">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-12 lg:space-y-16">
            
            {/* Tab Selection */}
            <div className="flex p-1.5 bg-surface-2 rounded-2xl w-fit shadow-inner border border-border/50">
              {['overview', 'transcripts'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-surface shadow-xl text-primary' : 'text-text-muted hover:text-text-primary'}`}>{tab}</button>
              ))}
            </div>

            {activeTab === 'transcripts' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8"><h2 className="text-xl sm:text-3xl font-black tracking-tight">Intelligence Log</h2></div>
                <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>}>
                  {session?.user?.id && <TranscriptList userId={session.user.id} role="PARENT" />}
                </Suspense>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Upcoming Deployment */}
                <section>
                   <h2 className="text-xl sm:text-3xl font-black tracking-tight mb-8">Upcoming Session</h2>
                   <Card className="p-0 overflow-hidden shadow-premium border-primary/10 bg-gradient-to-br from-surface to-primary/[0.02]">
                     <div className="flex flex-col sm:flex-row items-stretch">
                        <div className="sm:w-1/3 bg-surface-2/50 flex flex-col items-center justify-center p-8 border-b sm:border-b-0 sm:border-r border-border">
                           <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-xl mb-4 group hover:scale-105 transition-transform">
                             <Image 
                               src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" 
                               alt="Mentor" 
                               width={64}
                               height={64}
                               className="w-full h-full object-cover"
                             />
                           </div>
                           <p className="text-sm font-black text-text-primary">Rahul Sharma</p>
                           <p className="text-[9px] font-black uppercase text-primary tracking-widest mt-1">Verified Expert</p>
                        </div>
                        <div className="flex-1 p-8">
                           <h3 className="text-xl font-black mb-2 text-text-primary">Career Strategy Call</h3>
                           <p className="text-sm font-medium text-text-secondary mb-8 leading-relaxed max-w-sm">Senior SWE at Google will guide your child through the tech recruitment landscape.</p>
                           <div className="flex flex-wrap gap-4 mb-10">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-xl border border-border text-[10px] font-black uppercase tracking-widest"><Calendar className="w-3 h-3 text-primary" /> Jan 20</div>
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-xl border border-border text-[10px] font-black uppercase tracking-widest"><Clock className="w-3 h-3 text-accent" /> 06:00 PM</div>
                           </div>
                           <Button variant="primary" className="w-full sm:w-auto h-12 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">Initialize Link</Button>
                        </div>
                     </div>
                   </Card>
                </section>

                {/* Circle Feed */}
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl sm:text-3xl font-black tracking-tight">Parent Circle</h2>
                    <Link href="/parent-circle" className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-0.5">Explore Network</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {[
                      { name: 'Meena Sharma', text: 'Is VIT good for CSE?', time: '2h ago', status: 'College' },
                      { name: 'Rajesh Gupta', text: 'Thanks for sharing fee details.', time: '1d ago', status: 'School' },
                    ].map((conv, i) => (
                      <Card key={i} className="p-6 hover:shadow-premium hover:border-primary/20 transition-all group cursor-pointer border-2 border-transparent">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border group-hover:border-primary/30 transition-all flex items-center justify-center overflow-hidden">
                            <Image 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.name}`} 
                              alt={conv.name} 
                              width={48}
                              height={48}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-1">
                                <p className="font-black text-text-primary truncate">{conv.name}</p>
                                <span className="text-[9px] font-black text-text-muted uppercase">{conv.time}</span>
                             </div>
                             <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-2">Child in {conv.status}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-text-secondary line-clamp-2 italic leading-relaxed">"{conv.text}"</p>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8 sm:sticky sm:top-28 h-fit">
            <Card className="p-8 sm:p-10 shadow-premium border-primary/5 bg-gradient-to-br from-accent/5 to-transparent">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-8 flex items-center gap-3"><MessageCircle className="w-5 h-5" /> Expert Intel</h3>
               <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-surface shadow-inner border border-border relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                     <p className="text-sm font-black text-text-primary italic leading-relaxed">"Don't push for stable jobs, push for high-growth industries."</p>
                     <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mt-4">— VP, Tech Strategy</p>
                  </div>
                  <Button variant="secondary" className="w-full h-14 font-black uppercase tracking-widest text-[10px] border-border rounded-2xl shadow-sm hover:shadow-md transition-all">Unlock All Guides</Button>
               </div>
            </Card>

            <button onClick={() => signOut()} className="w-full h-14 rounded-2xl bg-surface-2 text-text-muted hover:text-error hover:bg-error/5 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
               <LogOut className="w-4 h-4" /> Terminate Access
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar */}
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
