'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, CreditCard, ShieldAlert, Activity,
  Star, Download, Search, ChevronLeft, ChevronRight,
  Ban, CheckCircle, XCircle, Trash2, TrendingUp,
  Calendar, DollarSign, Eye, RefreshCw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ReviewsList } from '@/components/reviews/reviews-list';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Analytics {
  totalUsers: number; newUsers: number; totalBookings: number;
  completedSessions: number; totalRevenue: number;
  revenueByDay: { date: string; amount: number }[];
  activeMentors: number; pendingBookings: number;
  disputeCount: number; openDisputes: number; periodDays: number;
}

interface AdminUser {
  id: string; email: string; role: string; isBanned: boolean;
  createdAt: string; name: string; profile: Record<string, unknown> | null;
  bookingCount: number;
}

interface RefundRecord {
  id: string; amount: number; status: string; reason: string;
  initiatedBy: string; razorpayRefundId: string | null;
  createdAt: string; completedAt: string | null;
  bookingId: string; topic: string;
  customerName: string; customerEmail: string | null;
}

type Tab = 'overview' | 'users' | 'reviews' | 'refunds' | 'transcripts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-black text-text-primary">{value}</p>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-2 justify-center pt-4">
      <Button variant="ghost" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-text-secondary px-2">Page {page} of {totalPages}</span>
      <Button variant="ghost" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 rounded-xl bg-surface animate-pulse border border-border" />
      ))}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [banned, setBanned] = useState<string>('');
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (p = 1, q = search, b = banned) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      if (b) params.set('banned', b);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
      setPage(p);
    } catch { console.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, banned]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async (userId: string, action: 'ban' | 'unban') => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) fetchUsers(page, search, banned);
  };

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <select value={banned} onChange={(e) => { setBanned(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-text-primary">
          <option value="">All users</option>
          <option value="true">Banned</option>
          <option value="false">Active</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => fetchUsers(1, search, banned)}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-text-muted">{total} result{total !== 1 ? 's' : ''}</p>

      {loading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
              <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-text-muted font-bold text-sm">
                {u.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{u.name}</p>
                <p className="text-xs text-text-muted truncate">{u.email}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'EMPLOYEE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {u.role}
              </span>
              <span className={`text-xs font-medium ${u.isBanned ? 'text-red-500' : 'text-emerald-500'}`}>
                {u.isBanned ? 'Banned' : 'Active'}
              </span>
              <span className="text-xs text-text-muted">{u.bookingCount} bookings</span>
              <Button
                variant={u.isBanned ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleBan(u.id, u.isBanned ? 'unban' : 'ban')}
              >
                {u.isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); fetchUsers(p, search, banned); }} />
    </div>
  );
}

// ─── Refunds Tab ──────────────────────────────────────────────────────────────

function RefundsTab() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRefunds = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/refunds?page=${p}&limit=15`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRefunds(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
      setPage(p);
    } catch { console.error('Failed to load refunds'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  return (
    <div className="space-y-3">
      {loading ? <LoadingSkeleton /> : refunds.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-text-muted">No refunds found</p>
        </div>
      ) : refunds.map((r) => (
        <div key={r.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{r.customerName}</p>
            <p className="text-xs text-text-muted">{r.topic || 'Session'} • {formatDate(r.createdAt)}</p>
          </div>
          <span className="text-sm font-bold text-text-primary">{formatINR(r.amount)}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {r.status}
          </span>
          {r.initiatedBy && <span className="text-xs text-text-muted">by {r.initiatedBy}</span>}
        </div>
      ))}
      <Pagination page={page} totalPages={totalPages} onChange={(p) => fetchRefunds(p)} />
    </div>
  );
}

// ─── Transcripts Tab ─────────────────────────────────────────────────────────

function TranscriptsTab() {
  const [transcripts, setTranscripts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transcripts?limit=20')
      .then((r) => r.json())
      .then((j) => setTranscripts(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      {loading ? <LoadingSkeleton /> : transcripts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-text-muted">No transcripts yet</p>
        </div>
      ) : transcripts.map((t: Record<string, unknown>) => (
        <div key={t.id as string} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{(t as { summary?: string }).summary?.slice(0, 80) ?? 'Transcript'}…</p>
            <p className="text-xs text-text-muted">Booking: {(t as { bookingId?: string }).bookingId}</p>
          </div>
          <a href={`/api/transcripts/${t.id}/download`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (tab === 'overview') {
      setAnalyticsLoading(true);
      fetch('/api/admin/analytics?days=30')
        .then((r) => r.json())
        .then(setAnalytics)
        .catch(console.error)
        .finally(() => setAnalyticsLoading(false));
    }
  }, [tab]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'refunds', label: 'Refunds', icon: DollarSign },
    { id: 'transcripts', label: 'Transcripts', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Admin OS</h1>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-widest">GetCareerTruth</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-500">System Online</span>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {analyticsLoading ? <LoadingSkeleton rows={4} /> : analytics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Users" value={String(analytics.totalUsers)} icon={Users} color="bg-blue-500/10 text-blue-500" />
                  <StatCard label="New (30d)" value={String(analytics.newUsers)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
                  <StatCard label="Revenue" value={formatINR(analytics.totalRevenue)} icon={DollarSign} color="bg-amber-500/10 text-amber-500" />
                  <StatCard label="Sessions" value={String(analytics.completedSessions)} icon={Calendar} color="bg-purple-500/10 text-purple-500" />
                  <StatCard label="Pending Requests" value={String(analytics.pendingBookings)} icon={Activity} color="bg-orange-500/10 text-orange-500" />
                  <StatCard label="Active Mentors" value={String(analytics.activeMentors)} icon={Users} color="bg-cyan-500/10 text-cyan-500" />
                  <StatCard label="Open Disputes" value={String(analytics.openDisputes)} icon={ShieldAlert} color="bg-red-500/10 text-red-500" />
                  <StatCard label="Mentor Apps" value="—" icon={CheckCircle} color="bg-slate-500/10 text-slate-500" />
                </div>
                {/* Revenue chart (simple bar list) */}
                <Card className="p-6">
                  <h3 className="text-sm font-bold text-text-primary mb-4">Revenue — Last {analytics.periodDays} Days</h3>
                  <div className="flex items-end gap-1 h-32">
                    {analytics.revenueByDay.slice(-14).map((d) => {
                      const maxAmt = Math.max(...analytics.revenueByDay.map((x) => x.amount), 1);
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-primary/20 rounded-t relative" style={{ height: `${Math.max(4, (d.amount / maxAmt) * 120)}px` }}>
                            <div className="absolute inset-0 bg-primary/60 rounded-t" />
                          </div>
                          <span className="text-xs text-text-muted">{new Date(d.date).getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && <UsersTab />}

        {/* ── Reviews ── */}
        {tab === 'reviews' && (
          <div>
            <ReviewsList employeeId="__admin__" isAdminView onApprove={undefined} onReject={undefined} onDelete={undefined} />
          </div>
        )}

        {/* ── Refunds ── */}
        {tab === 'refunds' && <RefundsTab />}

        {/* ── Transcripts ── */}
        {tab === 'transcripts' && <TranscriptsTab />}
      </div>
    </div>
  );
}