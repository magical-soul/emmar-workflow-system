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
  { id: '7bc3b388-af30-4042-abba-b7c87708a359', name: 'Emaar Properties' },
  { id: '568ba0bf-51fd-420d-8bcf-a40de14111f3', name: 'Emaar Malls' },
  { id: '82b79872-0173-41bb-8c44-c0bb8b43221c', name: 'Emaar Entertainment' }
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
