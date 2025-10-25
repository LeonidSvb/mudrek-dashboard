'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Run {
  id: string;
  script_name: string;
  status: 'running' | 'success' | 'error' | 'failed' | 'partial';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  records_fetched: number | null;
  records_inserted: number | null;
  records_updated: number | null;
  records_failed: number | null;
  api_cost: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

interface Log {
  id: string;
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARNING' | 'DEBUG';
  step: string;
  message: string;
  meta: Record<string, unknown> | null;
}

export default function ExecutionLogsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScript, setFilterScript] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ));
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchRuns();
    }
  }, [filterStatus, filterScript, supabase]);

  useEffect(() => {
    if (selectedRun && supabase) {
      fetchLogs(selectedRun.id);
    }
  }, [selectedRun, supabase]);

  async function fetchRuns() {
    if (!supabase) return;
    setLoading(true);
    let query = supabase
      .from('runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterScript !== 'all') {
      query = query.eq('script_name', filterScript);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching runs:', error);
    } else {
      setRuns(data || []);
      if (data && data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    }
    setLoading(false);
  }

  async function fetchLogs(runId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('run_id', runId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data || []);
    }
  }

  function getStatusBadge(status: string) {
    const variants = {
      success: 'default',
      error: 'destructive',
      failed: 'destructive',
      running: 'secondary',
      partial: 'secondary',
    } as const;

    const emojis = {
      success: '✅',
      error: '❌',
      failed: '❌',
      running: '⏳',
      partial: '⚠️',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {emojis[status as keyof typeof emojis]} {status.toUpperCase()}
      </Badge>
    );
  }

  function getLevelBadge(level: string) {
    const colors = {
      INFO: 'bg-blue-100 text-blue-800',
      ERROR: 'bg-red-100 text-red-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      DEBUG: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level as keyof typeof colors]}`}>
        {level}
      </span>
    );
  }

  function formatDuration(ms: number | null) {
    if (!ms) return 'N/A';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function getTimeAgo(timestamp: string) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Execution Logs</h1>
        <p className="text-gray-600">Monitor and debug synchronizations</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="running">Running</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterScript} onValueChange={setFilterScript}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by script" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scripts</SelectItem>
            <SelectItem value="contacts">Contacts</SelectItem>
            <SelectItem value="deals">Deals</SelectItem>
            <SelectItem value="calls">Calls</SelectItem>
            <SelectItem value="owners">Owners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>Last 50 executions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : runs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No runs found</div>
                ) : (
                  <div className="divide-y">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedRun?.id === run.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm">{run.script_name}</div>
                          {getStatusBadge(run.status)}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>⏱ {formatDuration(run.duration_ms)}</div>
                          {run.records_fetched !== null && (
                            <div>📊 {run.records_fetched} records</div>
                          )}
                          <div className="text-gray-500">{getTimeAgo(run.started_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedRun ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedRun.script_name}
                      {getStatusBadge(selectedRun.status)}
                    </CardTitle>
                    <CardDescription>
                      Started {formatTimestamp(selectedRun.started_at)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-600">Duration</div>
                    <div className="font-semibold">{formatDuration(selectedRun.duration_ms)}</div>
                  </div>
                  {selectedRun.records_fetched !== null && (
                    <div>
                      <div className="text-xs text-gray-600">Fetched</div>
                      <div className="font-semibold">{selectedRun.records_fetched}</div>
                    </div>
                  )}
                  {selectedRun.records_inserted !== null && (
                    <div>
                      <div className="text-xs text-gray-600">Inserted</div>
                      <div className="font-semibold">{selectedRun.records_inserted}</div>
                    </div>
                  )}
                  {selectedRun.records_updated !== null && (
                    <div>
                      <div className="text-xs text-gray-600">Updated</div>
                      <div className="font-semibold">{selectedRun.records_updated}</div>
                    </div>
                  )}
                  {selectedRun.records_failed !== null && selectedRun.records_failed > 0 && (
                    <div>
                      <div className="text-xs text-gray-600">Errors</div>
                      <div className="font-semibold text-red-600">{selectedRun.records_failed}</div>
                    </div>
                  )}
                </div>

                {selectedRun.error_message && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800 mb-1">Error Message</div>
                    <div className="text-sm text-red-600">{selectedRun.error_message}</div>
                  </div>
                )}

                <div className="mb-2 font-semibold">Detailed Logs</div>
                <ScrollArea className="h-[400px] border rounded-lg">
                  {logs.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No logs</div>
                  ) : (
                    <div className="divide-y">
                      {logs.map((log) => (
                        <div key={log.id} className="p-3 hover:bg-gray-50 font-mono text-xs">
                          <div className="flex items-start gap-3">
                            <div className="text-gray-500 whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </div>
                            {getLevelBadge(log.level)}
                            <div className="font-semibold text-gray-700 min-w-[80px]">
                              {log.step}
                            </div>
                            <div className="flex-1 text-gray-900">{log.message}</div>
                          </div>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <div className="mt-2 ml-[200px] text-gray-600 bg-gray-100 p-2 rounded">
                              {JSON.stringify(log.meta, null, 2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px] text-gray-500">
                Select a run to view logs
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
