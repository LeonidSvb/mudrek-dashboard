'use client';

import { useState, useEffect } from 'react';

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

export function SyncControls() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Загрузить последние синхронизации
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

  // Загрузить при монтировании
  useEffect(() => {
    fetchLogs();
  }, []);

  // Ручная синхронизация
  const handleSync = async () => {
    if (!confirm('Запустить синхронизацию с HubSpot? Это может занять 1-2 минуты.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Синхронизация завершена за ${data.duration}`);
        fetchLogs(); // Обновить логи
      } else {
        setError(data.error);
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`❌ Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Кнопка синхронизации */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Синхронизация с HubSpot</h2>
        <button
          onClick={handleSync}
          disabled={loading}
          className={`
            px-4 py-2 rounded-lg font-medium
            ${loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {loading ? '⏳ Синхронизация...' : '🔄 Запустить синхронизацию'}
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Последние синхронизации */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Последние синхронизации</h3>

        {logs.length === 0 ? (
          <p className="text-gray-500">Нет записей синхронизации</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {log.object_type}
                    </span>
                    <span
                      className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${log.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                        }
                      `}
                    >
                      {log.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(log.sync_started_at).toLocaleString('ru-RU')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Получено:</span>{' '}
                    <span className="font-medium">{log.records_fetched || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Обновлено:</span>{' '}
                    <span className="font-medium">{log.records_updated || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ошибок:</span>{' '}
                    <span className={log.records_failed > 0 ? 'text-red-600 font-medium' : ''}>
                      {log.records_failed || 0}
                    </span>
                  </div>
                </div>

                {log.duration_seconds && (
                  <div className="mt-2 text-xs text-gray-500">
                    Длительность: {log.duration_seconds}s
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Автоматическая синхронизация:</strong> каждые 2 часа через GitHub Actions
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Защищенные поля (не обновляются): closedate, amount, upfront_payment, installments
        </p>
      </div>
    </div>
  );
}
