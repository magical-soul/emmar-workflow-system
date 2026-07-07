import { createContext, useContext, useState, type ReactNode } from 'react';

interface WorkspaceContextType {
  activeTenantId: string;
  activeUserId: string;
  setActiveTenantId: (id: string) => void;
  setActiveUserId: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Pre-seeded Mappings matching our Database relational baseline seed configurations
export const SEEDED_TENANTS = [
  { id: '4186f5eb-ffc4-482d-b57b-98200fa2e5b4', name: 'Emaar Properties' },
  { id: '9dafb475-bb40-45fc-8a04-6d80e0d7624f', name: 'Emaar Malls' },
  { id: 'fba217ae-6d70-4d38-aa42-b1548da6377a', name: 'Emaar Entertainment' }
];

export const SEEDED_USERS = [
  { id: 'user-jyoti', name: 'Jyoti (Tenant Admin)', role: 'ADMIN' },
  { id: 'user-bob', name: 'Bob (Workspace Approver)', role: 'APPROVER' },
  { id: 'user-alice', name: 'Alice (Standard Agent)', role: 'USER' }
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Default tracking baseline to Emaar Properties and Jyoti's corporate token profile
  const [activeTenantId, setActiveTenantId] = useState(SEEDED_TENANTS[0].id);
  const [activeUserId, setActiveUserId] = useState(SEEDED_USERS[0].id);

  return (
    <WorkspaceContext.Provider value={{ activeTenantId, activeUserId, setActiveTenantId, setActiveUserId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('Workspace Context Exception: useWorkspace must be evaluated within a WorkspaceProvider container.');
  }
  return context;
}
