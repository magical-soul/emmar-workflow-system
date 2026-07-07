import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { type AuditLog } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';

export function useAuditTrail() {
  const { activeTenantId, activeUserId } = useWorkspace();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);

  const loadActiveItemAuditTrail = useCallback(async (itemId: string) => {
    setSelectedItemId(itemId);
    setAuditError(null);
    try {
      const response = await apiService.fetchAuditLogs(activeTenantId, activeUserId, itemId);
      setAuditLogs(response.data);
    } catch (err: any) {
      setAuditError(err.message || 'Failed to pull structural logging histories.');
    }
  }, [activeTenantId, activeUserId]);

  const clearAuditSelection = () => {
    setSelectedItemId(null);
    setAuditLogs([]);
  };

  return {
    selectedItemId,
    auditLogs,
    auditError,
    loadActiveItemAuditTrail,
    clearAuditSelection
  };
}
