import { useState, useEffect, useCallback } from "react";
import { apiService } from "../services/apiService";
import type { AuditLog, Item } from "../types";

export function useDashboard(activeTenantId: string, activeUserId: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState({ totalPagesCount: 1, currentPage: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
   const [globalCounts, setGlobalCounts] = useState({
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    CONFIRMED: 0,
    ESCALATED: 0
  });

  // Standardized data load wrapper
  const loadDashboardData = useCallback(async () => {
    if (
      !activeTenantId ||
      !activeUserId ||
      activeTenantId.includes("placeholder")
    ) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiService.fetchItems(
        activeTenantId,
        activeUserId,
        currentPage,
        6,
        selectedStateFilter || undefined,
      );
      setItems(response.items);
      setMeta({
        totalPagesCount: response.meta.totalPagesCount,
        currentPage: response.meta.currentPage,
      });

      if (response.meta.globalCounts) {
        setGlobalCounts(response.meta.globalCounts);
      }

      const requestResponse = await apiService.fetchPendingApprovals(
        activeTenantId,
        activeUserId,
      );
      setPendingRequests(requestResponse.data);
    } catch (err: any) {
      setErrorMessage(
        err.message || "System failed to synchronize data streams.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, activeUserId, currentPage, selectedStateFilter]);

  // Sync data automatically whenever workspace tracking states toggle
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, activeUserId]);

  // Load audit timeline dynamically whenever an entry card is targeted
  const loadActiveItemAuditTrail = useCallback(
    async (itemId: string) => {
      setSelectedItemId(itemId);
      try {
        const response = await apiService.fetchAuditLogs(
          activeTenantId,
          activeUserId,
          itemId,
        );
        setAuditLogs(response.data);
      } catch (err: any) {
        console.error("Timeline extraction failure:", err.message);
      }
    },
    [activeTenantId, activeUserId],
  );

  // MUTATION ACTION HANDLER: Workflow Shifts
  const handleWorkflowTransition = async (
    itemId: string,
    targetState: string,
  ) => {
    try {
      setErrorMessage(null);
      await apiService.triggerTransition(
        activeTenantId,
        activeUserId,
        itemId,
        targetState,
      );
      await loadDashboardData();
      if (selectedItemId === itemId) await loadActiveItemAuditTrail(itemId);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // MUTATION ACTION HANDLER: Signature Resolutions
  const handleApprovalSignature = async (
    requestId: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    try {
      setErrorMessage(null);
      await apiService.resolveApproval(
        activeTenantId,
        activeUserId,
        requestId,
        action,
      );
      await loadDashboardData();
      if (selectedItemId) await loadActiveItemAuditTrail(selectedItemId);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleCreateItem = async (title: string) => {
    try {
      setErrorMessage(null);
      await apiService.createItem(activeTenantId, activeUserId, title);
      await loadDashboardData(); // Instantly refresh Kanban card matrix lists
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // MUTATION ACTION HANDLER: Delegation Matrix
  const handleDelegateAuthority = async (toUserId: string) => {
    try {
      setErrorMessage(null);
      await apiService.configureDelegation(
        activeTenantId,
        activeUserId,
        toUserId,
      );
      alert(
        `Success: Signature authorization delegated smoothly to target parameter token user ID: ${toUserId}`,
      );
      await loadDashboardData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeployBlueprint = async (
    title: string,
    states: string[],
    transitions: Array<{
      from: string;
      to: string;
      requiresApproval: boolean;
      approvalStrategy?: string;
    }>,
  ) => {
    try {
      setErrorMessage(null);
      setIsLoading(true);

      const response: any = await apiService.configureWorkflowBlueprint(
        activeTenantId,
        activeUserId,
        title,
        states,
        transitions,
      );

      // Flash the backend's dynamic response success string (which includes the new Version number!)
      alert(`System Confirmation: ${response.data.message}`);
      await loadDashboardData(); // Synchronize all channels
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Workflow blueprint deployment rejected by system validation engines.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    items,
    meta,
    currentPage,
    setCurrentPage,
    selectedStateFilter,
    setSelectedStateFilter,
    selectedItemId,
    auditLogs,
    isLoading,
    errorMessage,
    loadActiveItemAuditTrail,
    handleWorkflowTransition,
    handleApprovalSignature,
    pendingRequests,
    handleCreateItem,
    handleDelegateAuthority,
    handleDeployBlueprint,
    globalCounts
  };
}
