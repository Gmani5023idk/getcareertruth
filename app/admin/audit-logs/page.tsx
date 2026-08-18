'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Search, Filter, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  USER_REGISTERED: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  USER_LOGIN: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  USER_LOGIN_FAILED: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  ADMIN_ACTION: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  PAYMENT_INITIATED: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  PAYMENT_SUCCESS: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  PAYMENT_FAILED: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  PAYMENT_REFUNDED: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  RATE_LIMIT_HIT: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  WEBHOOK_RECEIVED: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  WEBHOOK_FAILED: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
};

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data: PaginatedResponse = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLogs();
    }
  }, [fetchLogs, status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  const maskUserId = (id: string | null) => {
    if (!id) return '—';
    return id.slice(0, 4) + '...' + id.slice(-4);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Audit Logs</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {total} total entries — forensic trail of all critical actions
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <Filter size={16} />
          Filters
          {(actionFilter || dateFrom || dateTo) && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by user ID, entity, or IP address..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">All actions</option>
                <option value="USER_REGISTERED">User Registered</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_LOGIN_FAILED">Login Failed</option>
                <option value="ADMIN_ACTION">Admin Action</option>
                <option value="PAYMENT_INITIATED">Payment Initiated</option>
                <option value="PAYMENT_SUCCESS">Payment Success</option>
                <option value="PAYMENT_FAILED">Payment Failed</option>
                <option value="PAYMENT_REFUNDED">Payment Refunded</option>
                <option value="RATE_LIMIT_HIT">Rate Limit Hit</option>
                <option value="WEBHOOK_RECEIVED">Webhook Received</option>
                <option value="WEBHOOK_FAILED">Webhook Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">Time</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">User</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">IP</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[var(--color-primary)]" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                      <Activity size={32} />
                      <p>No audit logs found</p>
                      {(actionFilter || searchQuery) && (
                        <p className="text-xs">Try adjusting your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                        <Clock size={14} />
                        <span className="text-xs">{formatDate(log.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">
                      {maskUserId(log.userId)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--color-text-primary)]">{log.entity}</span>
                      {log.entityId && (
                        <span className="text-xs text-[var(--color-text-muted)] ml-1 font-mono">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.success ? (
                        <CheckCircle size={16} className="inline text-green-500" />
                      ) : (
                        <AlertTriangle size={16} className="inline text-red-500" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] disabled:opacity-40 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] disabled:opacity-40 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
