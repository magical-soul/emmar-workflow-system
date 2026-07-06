import React, { useState } from "react";
import { SEEDED_USERS, useWorkspace } from "../context/WorkspaceContext";

interface ActionControlBarProps {
  onCreateItem: (title: string) => Promise<void>;
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
  onDeployBlueprint
}: ActionControlBarProps) {
  const { activeUserId } = useWorkspace();
  const [itemTitle, setItemTitle] = useState("");
  const [delegateTargetId, setDelegateTargetId] = useState(SEEDED_USERS[1].id); // Defaults to Bob
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [blueprintTitle, setBlueprintTitle] = useState("");
  const [strategyModel, setStrategyModel] = useState<
    "SINGLE" | "MULTIPLE" | "QUORUM"
  >("SINGLE");

  // Dynamically resolve what role credential badge this active simulated actor holds 
  const currentUserProfile = SEEDED_USERS.find((u) => u.id === activeUserId);
  const isAdmin = currentUserProfile?.role === "ADMIN"; // Boolean check

  const handleBlueprintSubmit = async () => {
    if (!blueprintTitle.trim()) {
      alert(
        "Validation Block: Please provide a distinct structural blueprint title name before deploying.",
      );
      return;
    }

    setIsSubmitting(true);

    // Build a compliant, standardized multi-state transition map to pass down to our Zod validators 
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

    await onDeployBlueprint(blueprintTitle, customStates, customTransitions);
    setBlueprintTitle("");
    setIsSubmitting(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    setIsSubmitting(true);
    await onCreateItem(itemTitle);
    setItemTitle("");
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-md text-left">
      <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span>➕</span> Create New Workflow Item
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., Burj Khalifa Lease Agreement v2"
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold px-4 py-2 rounded-lg text-sm transition duration-200"
          >
            Create Asset
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <span>🔄</span> Delegate Signature Authority
        </h3>
        <div className="flex gap-2">
          <select
            value={delegateTargetId}
            onChange={(e) => setDelegateTargetId(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
          >
            {SEEDED_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => onDelegate(delegateTargetId)}
            className="bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600 font-bold px-4 py-2 rounded-lg text-sm transition duration-200"
          >
            Execute Delegation
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="md:col-span-2 border-t border-slate-700/50 pt-4 mt-2 flex flex-col gap-3">
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> Deploy Advanced Strategy Blueprint (Admin-Only)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configure state resolution metrics and specify active voting
              strategy models natively before instantiating tracking rows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-50">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Blueprint Title
              </label>
              <input
                type="text"
                placeholder="e.g., Commercial Lease Pipeline"
                value={blueprintTitle}
                onChange={(e) => setBlueprintTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-48">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Approval Strategy model
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
              className="self-end bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition duration-200 h-8 mt-auto shadow-sm"
            >
              Deploy Blueprint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
