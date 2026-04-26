'use client';

import { useState, useEffect } from 'react';
import { Zap, Play, Square, AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

interface TriggerLog {
  id: string;
  taskId: string;
  status: 'success' | 'failed' | 'running';
  timestamp: string;
  output?: string;
  error?: string;
}

export default function Triggers() {
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/timer');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTimerRunning(data.running || false);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const startTimer = async () => {
    try {
      await fetch('/api/timer', { method: 'POST' });
      fetchLogs();
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const stopTimer = async () => {
    try {
      await fetch('/api/timer', { method: 'DELETE' });
      fetchLogs();
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="text-emerald-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'running':
        return <Clock size={14} className="text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold tracking-tight">Triggers</h2>
      <p className="text-sm text-gray-400 mt-1">Local timer-based task scheduler</p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={20} className="text-blue-500" />
            <h3 className="text-sm font-medium">Timer Task</h3>
            {timerRunning && (
              <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Runs every minute and logs timestamp to console. Checks for consecutive empty calendar days.
          </p>
          
          <div className="flex gap-2">
            {!timerRunning ? (
              <button
                onClick={startTimer}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Play size={14} /> Start Timer
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                <Square size={14} /> Stop Timer
              </button>
            )}
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Recent Runs</h3>
            <span className="text-xs text-gray-400">{logs.length} entries</span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No runs yet. Start the timer to begin.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {[...logs].reverse().map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  {getStatusIcon(log.status)}
                  <div className="flex-1">
                    <p className="text-sm font-mono">{log.timestamp}</p>
                    {log.output && (
                      <p className="text-xs text-gray-500">{log.output}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}