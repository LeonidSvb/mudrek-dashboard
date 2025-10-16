'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface SyncLog {
  id: number;
  object_type: string;
  sync_started_at: string;
  sync_completed_at: string;
  duration_seconds: number;
  records_fetched: number;
  records_updated: number;
  records_failed: number;
  status: 'success' | 'partial' | 'failed';
}

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

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

  // Filter logs
  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.object_type === filter);

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

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No sync records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fetched
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 capitalize">
                          {log.object_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${log.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                            }
                          `}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.sync_started_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.records_fetched || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.records_updated || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={log.records_failed > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                          {log.records_failed || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.duration_seconds ? `${log.duration_seconds}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Total Syncs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Syncs
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {logs.length}
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Success Rate
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {logs.length > 0
                ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)
                : 0}%
            </div>
          </div>

          {/* Last Sync */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Last Sync
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {logs.length > 0
                ? new Date(logs[0].sync_started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Never'}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
