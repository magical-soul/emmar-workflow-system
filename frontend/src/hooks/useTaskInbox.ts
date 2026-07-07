import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useWorkspace } from '../context/WorkspaceContext';

export function useTaskInbox(onMutationSuccess?: () => Promise<void>) {
  const { activeTenantId, activeUserId } = useWorkspace();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);

  const loadPendingApprovals = useCallback(async () => {
    if (!activeTenantId || !activeUserId) return;
    try {
      const response = await apiService.fetchPendingApprovals(activeTenantId, activeUserId);
      setPendingRequests(response.data);
    } catch (err: any) {
      setInboxError(err.message || 'Failed to synchronize signature task streams.');
    }
  }, [activeTenantId, activeUserId]);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals, activeUserId]);

  const handleApprovalSignature = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      setInboxError(null);
      await apiService.resolveApproval(activeTenantId, activeUserId, requestId, action);
      await loadPendingApprovals();
      if (onMutationSuccess) await onMutationSuccess();
    } catch (err: any) {
      setInboxError(err.message);
      throw err;
    }
  };

  const handleDelegateAuthority = async (toUserId: string) => {
    try {
      setInboxError(null);
      await apiService.configureDelegation(activeTenantId, activeUserId, toUserId);
      alert(`Success: Signature authorization delegated smoothly to target parameter token user ID: ${toUserId}`);
      await loadPendingApprovals();
      if (onMutationSuccess) await onMutationSuccess();
    } catch (err: any) {
      setInboxError(err.message);
    }
  };

  return {
    pendingRequests,
    inboxError,
    setInboxError,
    loadPendingApprovals,
    handleApprovalSignature,
    handleDelegateAuthority
  };
}
