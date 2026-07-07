import React, { useEffect } from "react";
import { WorkspaceControlBar } from "./components/WorkspaceControlBar";
import { ActionControlBar } from "./components/ActionControlBar";
import { TaskSignatureInbox } from "./components/TaskSignatureInbox";
import { KanbanBoard } from "./components/KanbanBoard";
import { PaginationBar } from "./components/PaginationBar";
import { AuditHistoryTimeline } from "./components/AuditHistoryTimeline";
import { useKanbanItems } from "./hooks/useKanbanItems";
import { useTaskInbox } from "./hooks/useTaskInbox";
import { useAuditTrail } from "./hooks/useAuditTrail";
import { useAdminWorkflow } from "./hooks/useAdminWorkflow";

export default function App() {
  const kanban = useKanbanItems();
  const inbox = useTaskInbox(kanban.loadItemsData);
  const audit = useAuditTrail();
  const admin = useAdminWorkflow(kanban.loadItemsData);

  const handleTransitionWithInboxSync = async (
    itemId: string,
    targetState: string,
  ) => {
    await kanban.handleWorkflowTransition(itemId, targetState);
    await inbox.loadPendingApprovals();
  };

  // Synchronize history ledger view details if active resolution signatures update rows
  useEffect(() => {
    if (audit.selectedItemId) {
      audit.loadActiveItemAuditTrail(audit.selectedItemId);
    }
  }, [kanban.items]);

  // Aggregate incoming tracking errors smoothly onto a single alert registry frame
  const combinedErrorMessage =
    kanban.errorMessage ||
    inbox.inboxError ||
    audit.auditError ||
    admin.adminError;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-900">
      <WorkspaceControlBar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {combinedErrorMessage && (
          <div className="bg-red-500/15 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 animate-shake">
            <span>🚨</span> <span>{combinedErrorMessage}</span>
          </div>
        )}

        {kanban.isLoading && (
          <div className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2 animate-pulse">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"></span>
            Syncing multi-tenant records...
          </div>
        )}

        {/* Creation & Delegation controls */}
        <ActionControlBar
          onCreateItem={kanban.handleCreateItem}
          onDelegate={inbox.handleDelegateAuthority}
          onDeployBlueprint={admin.handleDeployBlueprint}
        />

        {/*  Personalized Task Signatures Queue */}
        <TaskSignatureInbox
          requests={inbox.pendingRequests}
          onResolve={inbox.handleApprovalSignature}
        />

        {/* Dynamic State Machine Filtering Tabs */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-2 rounded-xl flex flex-wrap items-center gap-2 text-xs font-bold shadow-sm">
          <span className="text-slate-400 px-3 uppercase tracking-wider text-[10px]">
            Filter Dashboard View:
          </span>
          {[
            { label: "All Operations Ledger", value: "" },
            { label: "Drafts Only", value: "DRAFT" },
            { label: "Pending Queue", value: "PENDING_APPROVAL" },
            { label: "Confirmed Assets", value: "CONFIRMED" },
            { label: "SLA Escalations", value: "ESCALATED" },
          ].map((tab) => {
            const isActive = kanban.selectedStateFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  kanban.setSelectedStateFilter(tab.value);
                  kanban.setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition font-bold select-none cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Information-Dense Kanban Matrix Grid */}
        <KanbanBoard
          items={kanban.items}
          selectedItemId={audit.selectedItemId}
          globalCounts={kanban.globalCounts}
          onSelectCard={audit.loadActiveItemAuditTrail}
          isLoading={kanban.isLoading}
          onTriggerTransition={handleTransitionWithInboxSync}
        />

        {/* Optimized Cursor Pagination Navigator Bar */}
        <PaginationBar
          currentPage={kanban.currentPage}
          totalPages={kanban.meta.totalPagesCount}
          onPageChange={kanban.setCurrentPage}
        />

        {/* Reusable Immutable System Audit History Timeline Panel */}
        <AuditHistoryTimeline
          logs={audit.auditLogs}
          activeItemId={audit.selectedItemId}
        />
      </main>
    </div>
  );
}
