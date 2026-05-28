'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Star,
  TrendingUp,
  DollarSign,
  Users,
  ChevronRight,
  CheckCircle,
  Bell,
  LogOut,
  Settings,
  ShieldCheck,
  CreditCard,
  Loader2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Menu,
  X,
  LayoutDashboard,
  Wallet
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';

const TranscriptList = lazy(() => import('@/components/transcript/transcript-list'));

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    
    const fetchData = async () => {
      try {
        const [profileRes, upcomingRes, pendingRes] = await Promise.all([
          fetch(`/api/employees/${userId}`),
          fetch('/api/bookings?status=CONFIRMED'),
          fetch('/api/bookings?status=PENDING_CONFIRM'),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.employee);
        }
        if (upcomingRes.ok) {
          const upcomingData = await upcomingRes.json();
          setUpcomingSessions(upcomingData.bookings);
        }
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingRequests(pendingData.bookings);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session?.user?.id]);

  const handleApprove = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to approve');
      toast.success('Booking approved!');
      setPendingRequests(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Reject this request?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by mentor' }),
      });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Request rejected');
      setPendingRequests(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const user = profile || {
    fullName: session?.user?.name || 'Mentor',
    jobTitle: 'Mentor',
    company: 'GCT Network',
    verificationStatus: 'VERIFIED',
    rating: 4.9,
    totalCalls: 12,
    totalEarned: 42500,
    pricePerCall: 1500,
  };

  const navLinks = [
    { label: 'Overview', icon: LayoutDashboard, active: activeTab === 'overview', onClick: () => setActiveTab('overview') },
    { label: 'Schedule', icon: Calendar, href: '/availability' },
    { label: 'Earnings', icon: Wallet, href: '/payouts' },
    { label: 'Transcripts', icon: MessageSquare, active: activeTab === 'transcripts', onClick: () => setActiveTab('transcripts') },
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
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><ShieldCheck className="w-6 h-6" /></div>
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
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
              <span className="text-xl sm:text-2xl font-black tracking-tight hidden sm:block">GCT<span className="text-primary italic">Expert</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link, i) => (
                <button key={i} onClick={() => { if(link.onClick) link.onClick(); else window.location.href=link.href || '#'; }} className={`text-[10px] font-black uppercase tracking-widest transition-all ${link.active ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>{link.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <button className="p-2 text-text-secondary hover:text-primary relative transition-colors"><Bell className="w-5 h-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-surface animate-pulse"></span></button>
            <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-success/20 bg-surface shadow-sm">
              <Image 
                src={session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Expert'} 
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
        {/* Mobile-First Earnings Card (Priority) */}
        <section className="mb-10 sm:hidden">
           <Card className="p-8 bg-gradient-to-br from-primary to-accent border-none shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Portfolio Value</p>
                 <div className="text-4xl font-black text-white tracking-tighter mb-8">₹{user.totalEarned.toLocaleString('en-IN')}</div>
                 <div className="flex gap-4">
                    <Button className="flex-1 h-12 bg-white text-primary font-black uppercase tracking-widest text-[10px]">Withdraw</Button>
                    <Link href="/payouts" className="flex-1"><Button className="w-full h-12 bg-black/20 backdrop-blur-md text-white border-white/20 font-black uppercase tracking-widest text-[10px]">Ledger</Button></Link>
                 </div>
              </div>
           </Card>
        </section>

        {/* Desktop Welcome */}
        <div className="hidden sm:flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl font-black text-text-primary tracking-tight">Status: <span className="text-primary italic">Live</span></h1>
              <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm ${user.verificationStatus === 'VERIFIED' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}><ShieldCheck className="w-4 h-4" /> {user.verificationStatus}</span>
            </div>
            <p className="text-text-secondary text-lg font-medium opacity-80">{user.jobTitle} @ {user.company}</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-sm"><Settings className="w-4 h-4 mr-2" /> Adjust Profile</Button>
            <Link href="/availability"><Button variant="primary" className="h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"><Calendar className="w-4 h-4 mr-2" /> Global Slots</Button></Link>
          </div>
        </div>

        {/* Stats Grid - 2x2 on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          {[
            { label: 'Revenue', value: `₹${user.totalEarned}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Engagements', value: user.totalCalls, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Impact Score', value: user.rating, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-400/10' },
            { label: 'Unit Price', value: `₹${user.pricePerCall}`, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
          ].map((stat, i) => (
            <Card key={i} className="p-6 sm:p-8 hover:shadow-premium transition-all group border-primary/5">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-inner transition-transform group-hover:scale-110`}><stat.icon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                   <p className="text-xl sm:text-3xl font-black text-text-primary tracking-tighter">{stat.value}</p>
                   <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mt-1">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {/* Main Feed */}
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
                  {session?.user?.id && <TranscriptList userId={session.user.id} role="EMPLOYEE" />}
                </Suspense>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Pending Signal */}
                {pendingRequests.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                       <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3"><AlertCircle className="w-6 h-6 text-warning animate-pulse" /> Pending Syncs</h2>
                       <span className="text-[10px] font-black text-warning uppercase tracking-widest px-3 py-1 bg-warning/10 rounded-full border border-warning/20">{pendingRequests.length} Waiting</span>
                    </div>
                    <div className="space-y-4">
                      {pendingRequests.map((booking) => (
                        <Card key={booking.id} className="p-6 sm:p-8 bg-surface-2/30 border-dashed border-2 border-warning/30 hover:border-warning/50 transition-all">
                          <div className="flex flex-col sm:flex-row items-center gap-8">
                            <div className="flex-1 text-center sm:text-left">
                               <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Inbound Request</p>
                               <h3 className="text-xl font-black text-text-primary mb-1">{booking.student?.studentProfile?.fullName || 'User'}</h3>
                               <p className="text-sm font-bold text-primary mb-6">{booking.topic}</p>
                               <div className="flex items-center justify-center sm:justify-start gap-6 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {format(parseISO(booking.scheduledAt), 'MMM d')}</span>
                                  <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {format(parseISO(booking.scheduledAt), 'hh:mm a')}</span>
                               </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                               <Button variant="secondary" className="flex-1 sm:px-6 h-12 text-[10px] font-black uppercase" onClick={() => handleCancel(booking.id)}>Reject</Button>
                               <Button variant="primary" className="flex-1 sm:px-10 h-12 text-[10px] font-black uppercase shadow-lg shadow-primary/20" onClick={() => handleApprove(booking.id)}>Deploy</Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Upcoming Operations */}
                <section>
                   <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl sm:text-2xl font-black">Upcoming Operations</h2>
                   </div>
                   {upcomingSessions.length === 0 ? (
                     <Card className="p-16 text-center border-dashed border-2 bg-surface-2/30">
                        <p className="text-text-muted font-bold text-sm">Awaiting new engagements.</p>
                     </Card>
                   ) : (
                     <div className="space-y-6">
                       {upcomingSessions.map((session) => (
                         <Card key={session.id} className="p-8 group hover:border-primary/30 transition-all shadow-premium relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                             <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-xl font-black text-text-primary mb-1">{session.student?.studentProfile?.fullName || 'User'}</h3>
                                <p className="text-sm font-bold text-primary mb-8">{session.topic}</p>
                                <div className="flex items-center justify-center sm:justify-start gap-6 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                                   <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {format(parseISO(session.scheduledAt), 'MMM d')}</span>
                                   <span className="flex items-center gap-2 font-black text-text-primary bg-surface-3 px-3 py-1 rounded-lg"><Clock className="w-4 h-4" /> {format(parseISO(session.scheduledAt), 'hh:mm a')}</span>
                                </div>
                             </div>
                             <div className="flex flex-col gap-3 w-full sm:w-auto">
                                {session.meetingLink && <Button variant="primary" className="h-12 px-8 text-[10px] font-black uppercase shadow-xl shadow-primary/20" onClick={() => window.open(session.meetingLink, '_blank')}><ExternalLink className="w-4 h-4 mr-2" /> Connect</Button>}
                                {session.conversationId && <Link href={`/dashboard/chat/conversations/${session.conversationId}`} className="block"><Button variant="secondary" className="w-full h-12 px-8 text-[10px] font-black uppercase shadow-sm"><MessageSquare className="w-4 h-4 mr-2" /> Secure Chat</Button></Link>}
                             </div>
                           </div>
                         </Card>
                       ))}
                     </div>
                   )}
                </section>
              </div>
            )}
          </div>

          {/* Sidebar / Mobile Payout */}
          <div className="space-y-8 sm:sticky sm:top-28 h-fit">
            <Card className="p-8 sm:p-10 shadow-premium border-primary/5 hidden sm:block bg-gradient-to-br from-surface to-primary/[0.02]">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-8 flex items-center gap-3"><Wallet className="w-5 h-5 text-primary" /> Financial Clearances</h3>
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-surface shadow-inner border border-border">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Settlement Target</p>
                  <p className="text-4xl font-black text-text-primary tracking-tighter">₹{user.totalEarned.toLocaleString('en-IN')}</p>
                </div>
                <Button className="w-full h-14 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20">Initiate Settlement</Button>
                <div className="flex items-center gap-3 px-2">
                   <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                   <p className="text-[9px] font-black uppercase tracking-[0.1em] text-text-muted leading-tight">Payout cycle: Bi-weekly <br/>Next Sync: 1st June</p>
                </div>
              </div>
            </Card>

            <button onClick={() => signOut()} className="w-full h-14 rounded-2xl bg-surface-2 text-text-muted hover:text-error hover:bg-error/5 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 sm:shadow-sm">
              <LogOut className="w-4 h-4" /> Terminate Access
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-border z-[90] flex items-center justify-around px-4 shadow-2xl">
         {navLinks.map((link, i) => (
           <button key={i} onClick={() => { if(link.onClick) link.onClick(); else window.location.href=link.href || '#'; }} className={`flex flex-col items-center gap-1 p-2 ${link.active ? 'text-primary' : 'text-text-muted'}`}>
              <link.icon className={`w-5 h-5 ${link.active ? 'fill-primary/10' : ''}`} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{link.label}</span>
           </button>
         ))}
      </div>
    </div>
  );
}
