'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle,
  GraduationCap,
  Loader2,
  AlertCircle,
  DollarSign,
  Plus,
  MessageCircle,
  Edit2,
  Check,
  X,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Star,
  HeartHandshake,
  FileText,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { format, parseISO } from 'date-fns';

export default function ParentDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [editingChild, setEditingChild] = useState(false);
  const [childForm, setChildForm] = useState({ childCourse: '', childStage: '', concerns: [] as string[], openToConnect: true });
  const [savingChild, setSavingChild] = useState(false);
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/parent');
        if (!res.ok) throw new Error('Failed to load dashboard');
        const json = await res.json();
        setDashboardData(json.data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError((err as Error).message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session?.user?.id]);

  // Initialize child edit form when data loads
  useEffect(() => {
    if (dashboardData?.profile) {
      setChildForm({
        childCourse: dashboardData.profile.childCourse || '',
        childStage: dashboardData.profile.childStage || 'Career Planning',
        concerns: dashboardData.profile.concerns || [],
        openToConnect: dashboardData.profile.openToConnect ?? true,
      });
    }
  }, [dashboardData]);

  const saveChildProfile = async () => {
    setSavingChild(true);
    try {
      const res = await fetch('/api/dashboard/parent/child-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(childForm),
      });
      if (!res.ok) throw new Error('Failed to save');
      setEditingChild(false);
      setDashboardData((prev: Record<string, unknown>) => ({
        ...prev,
        profile: { ...(prev.profile as Record<string, unknown> || {}), ...childForm },
      }));
    } catch {
      // silent
    } finally {
      setSavingChild(false);
    }
  };

  const toggleConcern = (concern: string) => {
    setChildForm((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c) => c !== concern)
        : [...prev.concerns, concern],
    }));
  };

  const CONCERN_OPTIONS = [
    'Career Guidance',
    'College Admissions',
    'Skill Development',
    'Internship Search',
    'Interview Prep',
    'Study Abroad',
  ];

  const profile = dashboardData?.profile || {};
  const upcomingBookings = dashboardData?.upcomingBookings || [];
  const parentName = profile?.fullName || session?.user?.name || 'Parent';
  const childName = profile?.childName || '';
  const childStage = profile?.childStage || 'Career Planning';
  const mentorMessages = dashboardData?.mentorMessages || [];
  const progressSummary = dashboardData?.progressSummary || { totalHoursLearned: 0, uniqueTopicsExplored: 0 };
  const paymentHistory = dashboardData?.paymentHistory || [];

  const stats = [
    { label: 'Upcoming Sessions', value: upcomingBookings.length.toString(), icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completed', value: (dashboardData?.completedSessions || 0).toString(), icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Active Mentors', value: (dashboardData?.activeMentors || 0).toString(), icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Invested', value: `₹${(dashboardData?.totalPaid || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text-primary pb-24 sm:pb-0">
        {/* Skeleton Nav */}
        <nav className="border-b border-border bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-24 h-8 bg-surface-3 rounded-lg animate-pulse" />
              <div className="hidden md:flex gap-6">
                <div className="w-20 h-4 bg-surface-3 rounded animate-pulse" />
                <div className="w-24 h-4 bg-surface-3 rounded animate-pulse" />
                <div className="w-20 h-4 bg-surface-3 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-surface-3 rounded-xl animate-pulse" />
              <div className="w-9 h-9 bg-surface-3 rounded-full animate-pulse" />
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Welcome Skeleton */}
          <div className="mb-8 sm:mb-12">
            <div className="h-10 w-64 bg-surface-3 rounded-lg animate-pulse mb-3" />
            <div className="h-5 w-40 bg-surface-3/60 rounded animate-pulse" />
          </div>
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-8 mb-8 sm:mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 sm:p-8 rounded-2xl bg-surface border border-primary/5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-3 rounded-xl animate-pulse mb-4" />
                <div className="h-8 w-16 bg-surface-3 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-surface-3/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-8 sm:space-y-12">
              {/* Upcoming Sessions Skeleton */}
              <div className="p-8 rounded-2xl bg-surface border border-primary/5">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="sm:w-1/4 flex flex-col items-center">
                    <div className="w-14 h-14 bg-surface-3 rounded-2xl animate-pulse mb-3" />
                    <div className="h-4 w-16 bg-surface-3 rounded animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div className="h-3 w-20 bg-surface-3 rounded animate-pulse mx-auto sm:mx-0" />
                    <div className="h-6 w-48 bg-surface-3 rounded animate-pulse mx-auto sm:mx-0" />
                    <div className="h-4 w-36 bg-surface-3/50 rounded animate-pulse mx-auto sm:mx-0" />
                  </div>
                  <div className="h-8 w-24 bg-surface-3 rounded-xl animate-pulse" />
                </div>
              </div>
              {/* Summary Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-6 rounded-2xl bg-surface border border-primary/5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-surface-3 rounded-xl animate-pulse" />
                      <div className="h-4 w-32 bg-surface-3 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-16 bg-surface-3 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-surface border border-primary/5">
                <div className="h-3 w-28 bg-surface-3 rounded animate-pulse mb-6" />
                <div className="p-5 rounded-2xl bg-surface-3/50 animate-pulse mb-4">
                  <div className="h-3 w-16 bg-surface-3 rounded animate-pulse mb-1" />
                  <div className="h-8 w-28 bg-surface-3 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-primary/5">
                <div className="h-3 w-20 bg-surface-3 rounded animate-pulse mb-6" />
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-surface-3 rounded-xl animate-pulse mb-3" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <Card className="p-10 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">Connection Lost</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24 sm:pb-0">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Welcome Banner */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2">
            Welcome, <span className="text-primary">{parentName?.split(' ')[0] || 'Parent'}</span> 👋
          </h1>
          <p className="text-text-secondary text-base sm:text-lg font-medium flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            {childName ? `${childName}'s Journey` : childStage}
            {profile?.childCourse ? ` · ${profile.childCourse}` : ''}
          </p>
        </div>

        {/* Child Profile Card */}
        <Card className="p-6 sm:p-8 mb-6 sm:mb-8 border-primary/5 bg-gradient-to-br from-surface to-accent/[0.03]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black">{childName || 'Your Child'}'s Profile</h3>
                <p className="text-xs text-text-secondary font-medium">
                  {childForm.childCourse || childStage}
                  {childForm.childCourse ? ` · ${childStage}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (editingChild) {
                  saveChildProfile();
                } else {
                  setEditingChild(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
            >
              {editingChild ? (
                <>{savingChild ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save</>
              ) : (
                <><Edit2 className="w-3 h-3" /> Edit</>
              )}
            </button>
            {editingChild && (
              <button onClick={() => setEditingChild(false)} className="p-2 text-text-muted hover:text-error transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingChild ? (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 block">Course / Program</label>
                  <input
                    type="text"
                    value={childForm.childCourse}
                    onChange={(e) => setChildForm((prev) => ({ ...prev, childCourse: e.target.value }))}
                    placeholder="e.g. B.Tech CSE"
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1.5 block">Stage</label>
                  <select
                    value={childForm.childStage}
                    onChange={(e) => setChildForm((prev) => ({ ...prev, childStage: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/20 transition-all"
                  >
                    {['School (9-10)', 'School (11-12)', 'College (1st Year)', 'College (2nd Year)', 'College (3rd Year)', 'College (4th Year)', 'Gap Year', 'Career Planning'].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-2 block">Areas of Concern</label>
                <div className="flex flex-wrap gap-2">
                  {CONCERN_OPTIONS.map((concern) => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        childForm.concerns.includes(concern)
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-surface-2 text-text-secondary border-border hover:border-primary/30'
                      }`}
                    >
                      {concern}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Open to Connect</label>
                <button
                  onClick={() => setChildForm((prev) => ({ ...prev, openToConnect: !prev.openToConnect }))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${childForm.openToConnect ? 'bg-primary' : 'bg-border'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${childForm.openToConnect ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              {profile.concerns?.length > 0 ? (
                profile.concerns.map((c: string) => (
                  <span key={c} className="px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl border border-primary/10">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-muted italic">No areas of concern set</span>
              )}
              {childForm.openToConnect && (
                <span className="px-3 py-1.5 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-xl border border-success/20 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" /> Open to Connect
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          {stats.map((stat, i) => (
            <Card key={i} className="p-5 sm:p-8 hover:border-primary/20 transition-all group overflow-hidden relative border-primary/5">
              <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-[40px] opacity-20 -mr-4 -mt-4 transition-all group-hover:scale-150`}></div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-inner`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-3xl font-black tracking-tighter">{stat.value}</p>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mt-1">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-12">
            {/* Upcoming Sessions */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black">
                  {childName ? `${childName}'s Upcoming Sessions` : 'Upcoming Sessions'}
                </h2>
                <Link href="/bookings" className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20">View All</Link>
              </div>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-6">
                  {upcomingBookings.map((booking: any) => (
                    <Card key={booking.id} className="p-6 sm:p-8 group hover:border-primary/30 transition-all shadow-premium relative overflow-hidden border-primary/5">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                        <div className="sm:w-1/4 flex flex-col items-center sm:items-start text-center sm:text-left">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                            <Calendar className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-black">
                            {booking.scheduledAt
                              ? format(parseISO(booking.scheduledAt), 'MMM d')
                              : 'TBD'}
                          </p>
                          <p className="text-[9px] font-black uppercase text-text-muted mt-1">
                            {booking.scheduledAt
                              ? format(parseISO(booking.scheduledAt), 'hh:mm a')
                              : 'TBD'}
                          </p>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Session with</p>
                          <h3 className="text-xl font-black text-text-primary mb-1">
                            {booking.employee?.employeeProfile?.fullName || 'Mentor'}
                          </h3>
                          <p className="text-sm font-bold text-text-secondary">
                            {booking.employee?.employeeProfile?.jobTitle || ''}
                            {booking.employee?.employeeProfile?.company ? ` @ ${booking.employee.employeeProfile.company}` : ''}
                          </p>
                          <p className="text-sm font-bold text-primary mt-2">{booking.topic || 'Career Session'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            booking.status === 'CONFIRMED'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {booking.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                          </span>
                          {booking.conversationId && (
                            <Link href={`/chat?conversation=${booking.conversationId}`}>
                              <Button variant="secondary" className="text-[9px] font-black uppercase tracking-widest h-10 px-3 flex items-center gap-2">
                                <MessageCircle className="w-3 h-3" /> Message
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-16 text-center border-dashed border-2 bg-surface-2/30">
                  <GraduationCap className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-black mb-1">No active sessions</h3>
                  <p className="text-text-secondary mb-6">Find a mentor to help guide your child's career.</p>
                  <Link href="/employees">
                    <Button variant="primary" className="shadow-lg shadow-primary/20">Browse Mentors</Button>
                  </Link>
                </Card>
              )}
            </section>

            {/* Learning Progress */}
            <section>
              <h2 className="text-xl sm:text-2xl font-black mb-6">Learning Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-6 border-primary/5 bg-gradient-to-br from-surface to-accent/[0.02]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">Hours Learned</span>
                  </div>
                  <p className="text-3xl font-black">{progressSummary.totalHoursLearned}h</p>
                </Card>
                <Card className="p-6 border-primary/5 bg-gradient-to-br from-surface to-primary/[0.02]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">Topics Explored</span>
                  </div>
                  <p className="text-3xl font-black">{progressSummary.uniqueTopicsExplored}</p>
                </Card>
              </div>
            </section>

            {/* Mentor Activity (privacy-safe) */}
            {mentorMessages.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-primary" />
                    Mentor Conversations
                  </h2>
                </div>
                <div className="space-y-3">
                  {mentorMessages.map((msg: any) => (
                    <Card key={msg.conversationId} className="p-4 sm:p-6 border-primary/5 hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                            {msg.mentorName?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <p className="font-black text-sm">{msg.mentorName}</p>
                            <p className="text-[10px] text-text-muted font-medium">
                              Last activity: {msg.lastActivityAt
                                ? new Date(msg.lastActivityAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Link href={msg.employeeId ? `/employees/${msg.employeeId}` : '#'}>
                          <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest h-10 px-4">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted italic mt-3 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-success" />
                  Chat content between your child and mentors is private to respect their learning relationship.
                </p>
              </section>
            )}

            {/* Past Sessions */}
            {dashboardData?.pastSessions && dashboardData.pastSessions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Past Sessions
                  </h2>
                </div>
                <div className="space-y-4">
                  {dashboardData.pastSessions.map((session: any) => (
                    <Card key={session.id} className="p-6 border-primary/5 hover:border-primary/20 transition-all group">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-black text-lg">{session.mentorName}</h4>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-surface-2 px-2 py-1 rounded">
                              {session.topic || 'Career Session'}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mb-3">
                            {session.date ? format(parseISO(session.date), 'MMM d, yyyy') : 'N/A'} 
                            {session.duration && ` · ${Math.round(session.duration / 60)}h ${session.duration % 60}m`}
                          </p>
                          <div className="flex gap-3">
                            {session.hasTranscript && (
                              <Link href={session.transcriptUrl || '#'}>
                                <Button variant="secondary" className="text-[9px] font-black uppercase tracking-widest h-9 px-3">
                                  <FileText className="w-3 h-3 mr-1.5" /> View Summary
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Payment History */}
            {paymentHistory && paymentHistory.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-primary" />
                    💳 Payment History
                  </h2>
                  {paymentHistory.length > 5 && (
                    <Link href="/bookings?filter=payments" className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20">View All →</Link>
                  )}
                </div>
                <div className="space-y-3">
                  {paymentHistory.slice(0, 5).map((payment: any) => (
                    <Card key={payment.id} className="p-4 sm:p-6 border-primary/5 hover:border-primary/20 transition-all">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-sm">{payment.mentorName}</p>
                            <p className="text-[10px] text-text-muted font-medium">
                              {payment.date ? format(parseISO(payment.date), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-3 flex-1 sm:flex-initial">
                            <span className="font-black text-lg text-primary">₹{payment.amount?.toLocaleString('en-IN') || '0'}</span>
                            <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border whitespace-nowrap ${
                              payment.status === 'COMPLETED'
                                ? 'bg-success/10 text-success border-success/20'
                                : payment.status === 'REFUNDED'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-info/10 text-info border-info/20'
                            }`}>
                              {payment.status === 'COMPLETED' ? '✓ PAID' : payment.status === 'REFUNDED' ? 'REFUNDED' : 'PENDING'}
                            </span>
                          </div>
                          <Link href={payment.receiptUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest h-9 px-3">
                              <ExternalLink className="w-3 h-3 mr-1.5" /> Download
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {paymentHistory.length > 0 && (
                  <p className="text-[10px] text-text-muted italic mt-4">
                    Showing {Math.min(5, paymentHistory.length)} of {paymentHistory.length} payments
                  </p>
                )}
              </section>
            )}

            {/* Book a Session for Child */}
            <section>
              <Card className="p-8 text-center border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02] hover:border-primary/40 transition-all group">
                <HeartHandshake className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-black mb-2">Book a Session for {childName || 'Your Child'}</h3>
                <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
                  Find expert mentors to guide your child through their career journey, college admissions, and skill development.
                </p>
                <Link href="/employees">
                  <Button variant="primary" className="h-12 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Browse Available Mentors
                  </Button>
                </Link>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 border-primary/5 bg-gradient-to-br from-surface to-primary/[0.02]">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-6">Investment Summary</h3>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-surface border border-border shadow-inner">
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Total Invested</p>
                  <p className="text-3xl font-black text-text-primary tracking-tighter">
                    ₹{(dashboardData?.totalPaid || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Sessions This Month</p>
                  <p className="text-2xl font-black">{dashboardData?.completedSessions || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-primary/5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-6">Quick Links</h3>
              <div className="space-y-3">
                <Link href="/employees">
                  <Button variant="secondary" className="w-full justify-start gap-3 h-12 text-[10px] font-black uppercase tracking-widest">
                    <Users className="w-4 h-4" /> Find Mentors
                  </Button>
                </Link>
                <Link href="/bookings">
                  <Button variant="secondary" className="w-full justify-start gap-3 h-12 text-[10px] font-black uppercase tracking-widest">
                    <BookOpen className="w-4 h-4" /> View Bookings
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
