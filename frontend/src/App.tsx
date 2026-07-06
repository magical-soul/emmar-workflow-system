import { WorkspaceControlBar } from './components/WorkspaceControlBar';
import { KanbanBoard } from './components/KanbanBoard';
import { PaginationBar } from './components/PaginationBar';
import { TaskSignatureInbox } from './components/TaskSignatureInbox';
import { ActionControlBar } from './components/ActionControlBar';
import { AuditHistoryTimeline } from './components/AuditHistoryTimeline';
import { useWorkspace } from './context/WorkspaceContext';
import { useDashboard } from './hooks/useDashBoard';

export default function App() {
  const { activeTenantId, activeUserId } = useWorkspace();
  
  const {
    items,
    meta,
    currentPage,
    setCurrentPage,
    selectedItemId,
    auditLogs,
    isLoading,
    errorMessage,
    pendingRequests,
    loadActiveItemAuditTrail,
    handleWorkflowTransition,
    handleApprovalSignature,
    handleCreateItem,
    handleDelegateAuthority,
    handleDeployBlueprint,
    selectedStateFilter,
    setSelectedStateFilter,
    globalCounts
  } = useDashboard(activeTenantId, activeUserId);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-900">
      
      <WorkspaceControlBar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
            <span>🚨</span> <span>{errorMessage}</span>
          </div>
        )}

        {isLoading && (
          <div className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2 animate-pulse">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"></span>
            Syncing multi-tenant records...
          </div>
        )}

        {/* Item Generation & Authority Delegation Controller Blocks */}
       <ActionControlBar 
          onCreateItem={handleCreateItem}
          onDelegate={handleDelegateAuthority}
          onDeployBlueprint={handleDeployBlueprint}
        />

        <TaskSignatureInbox 
          requests={pendingRequests}
          onResolve={handleApprovalSignature}
        />

         <div className="bg-slate-800/40 border border-slate-700/50 p-2 rounded-xl flex flex-wrap items-center gap-2 text-xs font-bold shadow-sm">
          <span className="text-slate-400 px-3 uppercase tracking-wider text-[10px]">Filter Dashboard View:</span>
          {[
            { label: 'All Operations Ledger', value: '' },
            { label: 'Drafts Only', value: 'DRAFT' },
            { label: 'Pending Queue', value: 'PENDING_APPROVAL' },
            { label: 'Confirmed Assets', value: 'CONFIRMED' },
            { label: 'SLA Escalations', value: 'ESCALATED' }
          ].map((tab) => {
            const isActive = selectedStateFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setSelectedStateFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition font-bold select-none cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <KanbanBoard 
          items={items}
          selectedItemId={selectedItemId}
          globalCounts={globalCounts} 
          onSelectCard={loadActiveItemAuditTrail}
          onTriggerTransition={handleWorkflowTransition}
        />

        <PaginationBar 
          currentPage={currentPage}
          totalPages={meta.totalPagesCount}
          onPageChange={setCurrentPage}
        />

        <AuditHistoryTimeline 
          logs={auditLogs}
          activeItemId={selectedItemId}
        />

      </main>
    </div>
  );
}
