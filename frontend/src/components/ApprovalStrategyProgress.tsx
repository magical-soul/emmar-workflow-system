import { type Item } from '../types';

interface ApprovalStrategyProgressProps {
  item: Item;
}

export function ApprovalStrategyProgress({ item }: ApprovalStrategyProgressProps) {
  if (item.currentState !== 'PENDING_APPROVAL') return null;

  // Target the precise transition rule handling the verification phase
  const activeTransition = item?.workflow?.transitions?.find(
    (t) => t.fromStateName === 'PENDING_APPROVAL' && t.toStateName === 'CONFIRMED'
  );

  const currentStrategy = activeTransition?.approvalStrategy || 'SINGLE';

  // Compute dynamic metrics thresholds based on the active strategy rules
  let totalSignaturesRequired = 1;
  if (currentStrategy === 'MULTIPLE') totalSignaturesRequired = 2;
  if (currentStrategy === 'QUORUM') totalSignaturesRequired = 3;

  // Read the exact number of APPROVED rows from PostgreSQL! 
  const currentSignaturesCollected = item._count?.requests || 0;


  // Calculate percentage width dynamically for the green progress bar meter fill
  const fillPercentageWidth = (currentSignaturesCollected / totalSignaturesRequired) * 100;

  return (
    <div className="mt-2 bg-slate-900/80 border border-slate-700/50 rounded-xl p-2 flex flex-col gap-1 text-[11px]">
      {/* STRATEGY LABELS */}
      <div className="flex justify-between text-slate-400 font-semibold gap-1">
        <span>Strategy Rule:</span>
        <span className="text-amber-500 font-mono font-bold uppercase">
          {currentStrategy}
        </span>
      </div>

      {/* DYNAMIC VOTING PROGRESS BAR MATRIX */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
          <div
            style={{ width: `${fillPercentageWidth}%` }}
            className={`h-full transition-all duration-300 ${
              currentStrategy === 'SINGLE' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          ></div>
        </div>
        <span className="font-mono font-bold text-slate-300">
          {currentSignaturesCollected} / {totalSignaturesRequired} Signed
        </span>
      </div>
    </div>
  );
}
