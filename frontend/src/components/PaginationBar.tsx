interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ currentPage, totalPages, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 flex items-center justify-between gap-4 mt-4 shadow-sm">
      <div className="text-xs text-slate-400 font-semibold">
        Page <span className="text-slate-200">{currentPage}</span> of <span className="text-slate-200">{totalPages}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          ◀ Prev
        </button>
        
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}
