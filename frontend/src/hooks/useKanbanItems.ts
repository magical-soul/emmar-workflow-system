import { useState, useCallback, useEffect } from "react";
import { apiService } from "../services/apiService";
import { type Item } from "../types";
import { useWorkspace } from "../context/WorkspaceContext";

export function useKanbanItems() {
  const { activeTenantId, activeUserId } = useWorkspace();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState({ totalPagesCount: 1, currentPage: 1 });

  const [globalCounts, setGlobalCounts] = useState({
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    CONFIRMED: 0,
    ESCALATED: 0,
  });

  const loadItemsData = useCallback(async () => {
    if (!activeTenantId || !activeUserId) return;
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
    } catch (err: any) {
      setErrorMessage(
        err.message || "System failed to synchronize data streams.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, activeUserId, currentPage, selectedStateFilter]);

  useEffect(() => {
    let isSubscribed = true;
    
    async function syncData() {
      if (isSubscribed) {
        await loadItemsData();
      }
    }
    
    syncData();
    
    return () => {
      isSubscribed = false; // Prevents race condition leaks on sudden tenant toggles
    };
  }, [loadItemsData, activeUserId, currentPage, selectedStateFilter]);


  const handleCreateItem = async (title: string, blueprintTitle: string) => {
    try {
      setErrorMessage(null);
      await apiService.createItem(
        activeTenantId,
        activeUserId,
        title,
        blueprintTitle,
      );
      await loadItemsData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleWorkflowTransition = async (
    itemId: string,
    targetState: string,
  ) => {
    try {
      setErrorMessage(null);
      setIsLoading(true);
      await apiService.triggerTransition(
        activeTenantId,
        activeUserId,
        itemId,
        targetState,
      );
      await loadItemsData();
    } catch (err: any) {
      setErrorMessage(err.message);
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
    globalCounts,
    isLoading,
    errorMessage,
    setErrorMessage,
    loadItemsData,
    handleCreateItem,
    handleWorkflowTransition,
  };
}
