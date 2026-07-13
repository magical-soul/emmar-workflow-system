import React, { useEffect, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/apiService";

interface ActionControlBarProps {
  onCreateItem: (title: string, workflowTitle: string) => Promise<void>;
  onDelegate: (toUserId: string) => Promise<void>;
  onDeployBlueprint: (
    title: string,
    states: string[],
    transitions: Array<{
      from: string;
      to: string;
      requiresApproval: boolean;
      approvalStrategy?: string;
    }>,
  ) => Promise<void>;
}

export function ActionControlBar({
  onCreateItem,
  onDelegate,
  onDeployBlueprint,
}: ActionControlBarProps) {
  const { activeTenantId, activeUserId } = useWorkspace();
  const [itemTitle, setItemTitle] = useState("");
  const [delegateTargetId, setDelegateTargetId] = useState("user-bob");
  const [blueprintTitle, setBlueprintTitle] = useState("");
  const [strategyModel, setStrategyModel] = useState<
    "SINGLE" | "MULTIPLE" | "QUORUM"
  >("SINGLE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbBlueprints, setDbBlueprints] = useState<string[]>([]);
   const [selectedWorkflow, setSelectedWorkflow] = useState(
    "Luxury Property Sales Contract",
  );

  useEffect(() => {
    async function syncActiveBlueprints() {
      try {
        // Fetch only the blueprints registered to the new activeTenantId context
        const response = await apiService.fetchActiveTenantWorkflows(
          activeTenantId,
          activeUserId,
        );
        const titles = response.data.map((w: any) => w.title);

        // Include default fallback seed if the database is currently empty for this tenant
        if (
          !titles.includes("Luxury Property Sales Contract") &&
          activeTenantId === "4186f5eb-ffc4-482d-b57b-98200fa2e5b4"
        ) {
          titles.unshift("Luxury Property Sales Contract");
        }

        setDbBlueprints(titles);
        setSelectedWorkflow(titles[0] || "Luxury Property Sales Contract");
      } catch (err) {
        setDbBlueprints(["Luxury Property Sales Contract"]);
        setSelectedWorkflow("Luxury Property Sales Contract");
      }
    }
    syncActiveBlueprints();
  }, [activeTenantId]);

 

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    setIsSubmitting(true);

    // Always pass the true last deployed workflow name stored in memory!
    await onCreateItem(itemTitle, selectedWorkflow);

    setItemTitle("");
    setIsSubmitting(false);
  };

  const handleBlueprintSubmit = async () => {
    if (!blueprintTitle.trim()) {
      alert(
        "Validation Block: Please provide a distinct structural blueprint title name before deploying.",
      );
      return;
    }
    setIsSubmitting(true);

    const customStates = ["DRAFT", "PENDING_APPROVAL", "CONFIRMED"];
    const customTransitions = [
      { from: "DRAFT", to: "PENDING_APPROVAL", requiresApproval: false },
      {
        from: "PENDING_APPROVAL",
        to: "CONFIRMED",
        requiresApproval: true,
        approvalStrategy: strategyModel,
      },
    ];

    // Dispatch down to backend database streams
    await onDeployBlueprint(blueprintTitle, customStates, customTransitions);
    setDbBlueprints((prev) =>
      prev.includes(blueprintTitle) ? prev : [...prev, blueprintTitle],
    );
    setSelectedWorkflow(blueprintTitle);

    // Safe to wipe the input box instantly! No race conditions remain
    setBlueprintTitle("");
    setIsSubmitting(false);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-6 shadow-xl backdrop-blur-md">
      {/* CREATE NEW WORKFLOW ITEM */}
      <form
        onSubmit={handleCreateSubmit}
        className="flex flex-wrap items-end gap-4 pb-6 border-b border-slate-800"
      >
        <div className="flex flex-col gap-1 flex-1 min-w-60">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Create New Workflow Item
          </label>
          <input
            type="text"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            placeholder="e.g., Burj Khalifa Lease Agreement v2"
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
          />
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-56">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Target Workflow Template
          </label>
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
          >
            {dbBlueprints.length === 0 ? (
              <option value="Luxury Property Sales Contract">
                Luxury Property Sales Contract
              </option>
            ) : (
              dbBlueprints.map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !itemTitle.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition h-[32px] cursor-pointer"
        >
          Create Asset
        </button>
      </form>

      {/* DEPLOY ADVANCED STRATEGY BLUEPRINT & DELEGATION BAR */}
      <div className="flex flex-wrap gap-6 items-end justify-between">
        {/* BLUEPRINT FORM FIELDS */}
        <div className="flex flex-wrap items-end gap-4 flex-1">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Deploy Advanced Strategy Blueprint (Admin-Only)
            </label>
            <input
              type="text"
              value={blueprintTitle}
              onChange={(e) => setBlueprintTitle(e.target.value)}
              placeholder="e.g., Commercial Lease Pipeline"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Approval Strategy Model
            </label>
            <select
              value={strategyModel}
              onChange={(e) => setStrategyModel(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
            >
              <option value="SINGLE">SINGLE (1 Manager Signature)</option>
              <option value="MULTIPLE">MULTIPLE (Unanimous Approval)</option>
              <option value="QUORUM">QUORUM (Majority Vote &gt; 50%)</option>
            </select>
          </div>

          <button
            onClick={handleBlueprintSubmit}
            disabled={isSubmitting || !blueprintTitle.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition h-[32px] cursor-pointer"
          >
            Deploy Blueprint
          </button>
        </div>

        {/* REUSABLE DELEGATION CONTAINER PANEL */}
        <div className="flex items-end gap-3 border-l border-slate-800 pl-6 min-w-75">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Delegate Signature Authority
            </label>
            <select
              value={delegateTargetId}
              onChange={(e) => setDelegateTargetId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
            >
              <option value="user-bob">Bob (Workspace Approver)</option>
              <option value="user-jyoti">Jyoti (Tenant Admin)</option>
              <option value="user-alice">Alice (Standard Agent)</option>
            </select>
          </div>
          <button
            onClick={() => onDelegate(delegateTargetId)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold px-4 py-1.5 rounded-lg text-xs border border-slate-600 transition h-[32px] cursor-pointer"
          >
            Execute Delegation
          </button>
        </div>
      </div>
    </div>
  );
}
