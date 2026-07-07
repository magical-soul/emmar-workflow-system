import type { AuditLog } from '../types';

interface AuditHistoryTimelineProps {
  logs: AuditLog[];
  activeItemId: string | null;
}

export function AuditHistoryTimeline({ logs, activeItemId }: AuditHistoryTimelineProps) {
  if (!activeItemId) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-xs text-slate-500 font-medium italic select-none">
         Select any asset card from the Kanban board grid columns above to review its permanent, immutable audit trail timeline history feed.
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md flex flex-col gap-4 text-left">
      
      <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
        <span className="text-base">📜</span>
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Immutable System Audit Ledger Trail
        </h3>
        <span className="ml-auto bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
          {logs.length} Event Stamps Captured
        </span>
      </div>

      <div className="flex flex-col gap-4 max-h-63.75 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500 italic">
            No system logging logs recorded for this asset signature hash frame.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="relative pl-6 border-l-2 border-slate-700 flex flex-col gap-1 pb-1 last:pb-0">
              
              <span className="absolute -left-1.25 top-1.5 w-2 h-2 rounded-full bg-slate-500 border border-slate-900 ring-2 ring-slate-700/40"></span>
              
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <span className="bg-slate-900 border border-slate-700 text-amber-500 font-mono font-black px-2 py-0.5 rounded text-[10px]">
                  {log.action}
                </span>
                <span className="text-[11px] font-medium text-slate-500 font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm font-bold text-slate-200 mt-1">
                Transaction initiated by actor identifier: <strong className="text-slate-100 bg-slate-900/60 px-1.5 py-0.5 rounded font-mono text-xs">{log.performedBy}</strong>
              </p>

              {log.payload && (
                <div className="mt-1.5 bg-slate-900/50 rounded-lg p-3 text-[11px] font-mono text-slate-400 border border-slate-800/80 overflow-x-auto max-w-full">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}
