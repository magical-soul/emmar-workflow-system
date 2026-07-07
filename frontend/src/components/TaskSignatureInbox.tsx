interface TaskSignatureInboxProps {
  requests: any[];
  onResolve: (requestId: string, action: "APPROVED" | "REJECTED") => void;
}

export function TaskSignatureInbox({
  requests,
  onResolve,
}: TaskSignatureInboxProps) {
  const uniqueDisplayRequests = (requests || []).filter(
    (request, index, self) =>
      index === self.findIndex((r) => r.itemId === request.itemId),
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md flex flex-col gap-4">
      {/* CARD PANEL TITLE */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
        <span className="text-base">📥</span>
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Actionable Signature Inbox
        </h3>
        <span className="ml-auto bg-slate-900 border border-slate-700 text-amber-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
          {uniqueDisplayRequests.length} Tasks
        </span>
      </div>

      {/* ACTION TASKS INVENTORY LIST */}
      <div className="flex flex-col gap-3 max-h-75 overflow-y-auto pr-1">
        {uniqueDisplayRequests.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 italic font-medium">
            Your task inbox is completely clear. No outstanding signature
            verifications required.
          </div>
        ) : (
          uniqueDisplayRequests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-200 hover:border-slate-600"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-amber-500 font-bold tracking-widest uppercase">
                  Awaiting Authorization Signature
                </span>
                <h4 className="text-sm font-bold text-slate-200">
                  {req.item?.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-500">
                  Ticket Token ID:{" "}
                  <span className="font-mono">...{req.id.slice(-8)}</span>
                </p>
              </div>

              {/* ACTION CALL-TO-MUTATIONS BUTTON CONTROLS */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => onResolve(req.id, "REJECTED")}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => onResolve(req.id, "APPROVED")}
                  className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-lg transition duration-200 shadow-sm cursor-pointer"
                >
                  Approve Auth
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
