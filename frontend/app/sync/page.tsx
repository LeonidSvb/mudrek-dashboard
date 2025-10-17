'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface SyncLog {
  id: number;
  object_type: string;
  batch_id: string | null;
  sync_started_at: string;
  sync_completed_at: string;
  duration_seconds: number;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_failed: number;
  status: 'success' | 'partial' | 'failed';
  triggered_by: 'cron' | 'manual' | 'api';
}

interface SyncSession {
  batch_id: string;
  logs: SyncLog[];
  sync_started_at: string;
  sync_completed_at: string;
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_failed: number;
  status: 'success' | 'partial' | 'failed';
  duration_seconds: number;
  triggered_by: 'cron' | 'manual' | 'api';
}

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Fetch sync logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Trigger manual sync
  const handleSync = async () => {
    if (!confirm('Start HubSpot synchronization? This may take 1-2 minutes.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Sync completed in ${data.total_duration_seconds}s`);
        fetchLogs(); // Refresh logs
      } else {
        setError(data.error);
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Group logs by batch_id into sessions
  const groupLogsBySession = (logs: SyncLog[]): SyncSession[] => {
    const sessionMap = new Map<string, SyncLog[]>();

    logs.forEach(log => {
      const batchId = log.batch_id || `individual-${log.id}`;
      if (!sessionMap.has(batchId)) {
        sessionMap.set(batchId, []);
      }
      sessionMap.get(batchId)!.push(log);
    });

    return Array.from(sessionMap.entries()).map(([batch_id, logs]) => {
      const sortedLogs = logs.sort((a, b) => a.id - b.id);
      const firstLog = sortedLogs[0];
      const lastLog = sortedLogs[sortedLogs.length - 1];

      return {
        batch_id,
        logs: sortedLogs,
        sync_started_at: firstLog.sync_started_at,
        sync_completed_at: lastLog.sync_completed_at || firstLog.sync_started_at,
        total_fetched: logs.reduce((sum, log) => sum + (log.records_fetched || 0), 0),
        total_inserted: logs.reduce((sum, log) => sum + (log.records_inserted || 0), 0),
        total_updated: logs.reduce((sum, log) => sum + (log.records_updated || 0), 0),
        total_failed: logs.reduce((sum, log) => sum + (log.records_failed || 0), 0),
        status: logs.some(l => l.status === 'failed') ? 'failed' :
                logs.some(l => l.status === 'partial') ? 'partial' : 'success',
        duration_seconds: lastLog.duration_seconds || 0,
        triggered_by: firstLog.triggered_by || 'manual',
      };
    });
  };

  // Determine sync mode (Incremental vs Full)
  const getSyncMode = (session: SyncSession): 'Incremental' | 'Full' => {
    // If fetched < 10% of typical total, it's incremental
    // This is a heuristic - you could add a field to DB for more accuracy
    const avgFetchedPerType = session.total_fetched / session.logs.length;
    return avgFetchedPerType < 1000 ? 'Incremental' : 'Full';
  };

  // Toggle session expansion
  const toggleSession = (batchId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  // Filter and group logs
  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.object_type === filter);

  const sessions = groupLogsBySession(filteredLogs);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HubSpot Synchronization</h1>
          <p className="mt-2 text-gray-600">
            Manage data synchronization between HubSpot CRM and your database
          </p>
        </header>

        {/* Sync Control Card */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manual Sync</h2>
              <p className="text-sm text-gray-600 mt-1">
                Fetch latest data from HubSpot (contacts, deals, calls)
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={loading}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${loading
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                }
              `}
            >
              {loading ? '⏳ Syncing...' : '🔄 Start Sync'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Automatic Sync:</strong> Runs every 2 hours via GitHub Actions
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Protected fields (never updated): closedate, amount, upfront_payment, installments
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Sync History */}
        <div className="bg-white rounded-lg shadow">
          {/* Header with Filter */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Sync History</h3>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {['all', 'contacts', 'deals', 'calls'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${filter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No sync records found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => {
                const isExpanded = expandedSessions.has(session.batch_id);
                const syncMode = getSyncMode(session);

                return (
                  <div key={session.batch_id} className="bg-white">
                    {/* Session Header (clickable) */}
                    <div
                      onClick={() => toggleSession(session.batch_id)}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Expand/Collapse Icon */}
                          <button className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>

                          {/* Timestamp */}
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(session.sync_started_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${session.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : session.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              }
                            `}
                          >
                            {session.status}
                          </span>

                          {/* Sync Mode Badge */}
                          <span
                            className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${syncMode === 'Incremental'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                              }
                            `}
                          >
                            {syncMode}
                          </span>

                          {/* Batch ID (short) */}
                          <span className="text-xs text-gray-500 font-mono">
                            {session.batch_id.slice(0, 8)}...
                          </span>
                        </div>

                        {/* Summary Stats */}
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div>
                            <span className="font-medium text-gray-900">{session.total_fetched}</span> fetched
                          </div>
                          <div>
                            <span className="font-medium text-green-600">{session.total_inserted}</span> inserted
                          </div>
                          <div>
                            <span className="font-medium text-blue-600">{session.total_updated}</span> updated
                          </div>
                          {session.total_failed > 0 && (
                            <div>
                              <span className="font-medium text-red-600">{session.total_failed}</span> failed
                            </div>
                          )}
                          <div className="text-gray-500">
                            {session.duration_seconds}s
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && session.logs.length > 1 && (
                      <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                        <div className="mt-3 space-y-2">
                          {session.logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between py-2 px-4 bg-white rounded-md border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 capitalize w-20">
                                  {log.object_type === 'contacts' ? '📇 Contacts' :
                                   log.object_type === 'deals' ? '💼 Deals' :
                                   '📞 Calls'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-gray-600">
                                  {log.records_fetched} fetched
                                </div>
                                <div className="text-green-600">
                                  {log.records_inserted} inserted
                                </div>
                                <div className="text-blue-600">
                                  {log.records_updated} updated
                                </div>
                                {log.records_failed > 0 && (
                                  <div className="text-red-600">
                                    {log.records_failed} failed
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Total Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Sessions
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {sessions.length}
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Success Rate
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {sessions.length > 0
                ? Math.round((sessions.filter(s => s.status === 'success').length / sessions.length) * 100)
                : 0}%
            </div>
          </div>

          {/* Last Sync */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Last Sync
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {sessions.length > 0
                ? new Date(sessions[0].sync_started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Never'}
            </div>
          </div>

          {/* Total Records */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Records
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {sessions.length > 0
                ? sessions.reduce((sum, s) => sum + s.total_fetched, 0).toLocaleString()
                : 0}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
