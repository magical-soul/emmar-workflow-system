import { type Item } from "../types";
import { ApprovalStrategyProgress } from "./ApprovalStrategyProgress";

interface KanbanBoardProps {
  items: Item[];
  onSelectCard: (itemId: string) => void;
  selectedItemId: string | null;
  globalCounts: {
    DRAFT: number;
    PENDING_APPROVAL: number;
    CONFIRMED: number;
    ESCALATED: number;
  };
  isLoading: boolean;
  onTriggerTransition: (itemId: string, targetState: string) => void;
}

const COLUMNS: Array<{
  key: Item["currentState"];
  name: string;
  badgeColor: string;
}> = [
  {
    key: "DRAFT",
    name: "Draft Blueprints",
    badgeColor: "bg-slate-700 text-slate-300",
  },
  {
    key: "PENDING_APPROVAL",
    name: "Pending Verification",
    badgeColor: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  },
  {
    key: "CONFIRMED",
    name: "Confirmed Assets",
    badgeColor:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  {
    key: "ESCALATED",
    name: "Escalated Breach",
    badgeColor: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  },
];

export function KanbanBoard({
  items,
  onSelectCard,
  selectedItemId,
  onTriggerTransition,
  globalCounts,
  isLoading
}: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((column) => {
        // Filter out records belonging strictly to this column container mapping
        const filteredItems = items.filter(
          (item) => item.currentState === column.key,
        );
        const totalDatabaseRecordsInColumn = globalCounts[column.key] || 0;
        return (
          <div
            key={column.key}
            className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4 flex flex-col h-full min-h-[500px]"
          >
            {/* COLUMN HEADER */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {column.name}
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${column.badgeColor}`}
              >
                {totalDatabaseRecordsInColumn} TOTAL
              </span>
            </div>

            {/* CARDS LIST CONTAINER */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-150 pr-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-medium italic border border-dashed border-slate-700/40 rounded-xl">
                  No records active
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.id === selectedItemId;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectCard(item.id)}
                      className={`p-4 rounded-xl border transition duration-200 cursor-pointer text-left flex flex-col gap-3 group relative select-none ${
                        isSelected
                          ? "bg-slate-800 border-amber-500 shadow-lg shadow-amber-500/5"
                          : "bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      {/* CARD BODY METADATA */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                          ID: ...{item.id.slice(-8)}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition leading-snug">
                          {item.title}
                        </h4>
                      </div>
                      <ApprovalStrategyProgress item={item} />
                      {/* CONCURRENCY INDICATOR CAP */}
                      <div className="flex items-center justify-between mt-1 text-[11px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          👤{" "}
                          <span className="truncate max-w-20">
                            {item.createdBy}
                          </span>
                        </span>
                        <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-slate-300 font-mono text-[10px]">
                          WF-v{item?.workflow?.version}
                        </span>
                      </div>
                      {/* DYNAMIC PIPELINE MUTATION CONTROLLER ARROWS */}
                      <div
                        className="mt-2 pt-3 border-t border-slate-700/40 flex flex-col gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.currentState === "DRAFT" && (
                          <button
                            onClick={() =>
                              onTriggerTransition(item.id, "PENDING_APPROVAL")
                            }
                            className="w-full bg-slate-700 hover:bg-amber-500 hover:text-slate-900 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg transition duration-200 shadow-sm"
                          >
                            Submit Verification
                          </button>
                        )}
                        {item.currentState === "PENDING_APPROVAL" && (
                          <button
                            disabled={isLoading}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onTriggerTransition(item.id, "CONFIRMED");
                            }}
                            className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-900 border border-amber-500/20 text-xs font-bold py-1.5 px-3 rounded-lg transition duration-200 shadow-sm"
                          >
                            Request Confirmation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
