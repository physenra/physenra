import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  Tag,
} from 'lucide-react';

interface AuditItem {
  id: string;
  practice_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const PlatformAuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await saasSubscriptionService.getPlatformAuditEvents(100);
      setEvents(data);
    } catch (err: unknown) {
      console.error('Failed to load audit events:', err);
      setError(err instanceof Error ? err.message : 'Error fetching system audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Security & Platform Audit Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Immutable log of administrative overrides, tenant onboarding, and payment events.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 flex items-center gap-2 self-start transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Events Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Audit Stream (Latest 100 Events)
          </span>
          <span className="text-xs text-slate-500 font-mono">public.audit_events</span>
        </div>

        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
              Loading security audit stream...
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Zero audit events recorded.
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-4 hover:bg-slate-800/30 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-400 font-mono">{ev.action}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-500" />
                      {ev.entity_type}
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-400">
                  <span>
                    Scope:{' '}
                    {ev.practice_id ? (
                      <span className="font-mono text-slate-300">Practice ({ev.practice_id.slice(0, 8)}...)</span>
                    ) : (
                      <span className="text-cyan-400 font-semibold">Global Platform Plane</span>
                    )}
                  </span>
                  <span>
                    Entity ID: <span className="font-mono text-slate-300">{ev.entity_id}</span>
                  </span>
                </div>

                {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                  <pre className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto">
                    {JSON.stringify(ev.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
