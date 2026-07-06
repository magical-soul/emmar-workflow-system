import { useWorkspace, SEEDED_TENANTS, SEEDED_USERS } from '../context/WorkspaceContext';

export function WorkspaceControlBar() {
  const { activeTenantId, activeUserId, setActiveTenantId, setActiveUserId } = useWorkspace();

  // Find active profiles to display clear status indicators
  const currentTenant = SEEDED_TENANTS.find(t => t.id === activeTenantId);
  const currentUser = SEEDED_USERS.find(u => u.id === activeUserId);

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* BRAND TITLE LOGO */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏢</span>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white uppercase">
              Emaar Enterprise
            </h1>
            <p className="text-xs font-bold text-amber-500 tracking-wider uppercase">
              Workflow Integration Hub
            </p>
          </div>
        </div>

        {/* CONTROLLER SELECTORS */}
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
          
          {/* TENANT WORKSPACE SELECTOR DROPDOWN */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Active Tenant Workspace
            </label>
            <select
              value={activeTenantId}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="bg-slate-900 text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {SEEDED_TENANTS.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          {/* IDENTITY PROFILE SWITCHER DROPDOWN */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Simulated User Identity
            </label>
            <select
              value={activeUserId}
              onChange={(e) => setActiveUserId(e.target.value)}
              className="bg-slate-900 text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {SEEDED_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* SECURE SECURITY BADGE CONTEXT BANNER */}
      <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Data Isolation Enforced: <strong className="text-slate-200">{currentTenant?.name}</strong></span>
        </div>
        <div>
          <span>Authorization Badge: <span className="bg-slate-900 text-amber-500 px-2 py-0.5 rounded font-mono font-bold border border-slate-700">{currentUser?.role}</span></span>
        </div>
      </div>
    </header>
  );
}
