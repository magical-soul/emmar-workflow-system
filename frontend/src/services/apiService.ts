import type { AuditLog, PaginatedItemsResponse } from "../types";
import { apiRequest } from "../utils/api";


export const apiService = {
  // Optimized Paginated Fetch
  async fetchItems(
    tenantId: string,
    userId: string,
    page: number = 1,
    limit: number = 6,
    state?: string,
  ) {
    const query = `?page=${page}&limit=${limit}${state ? `&state=${state}` : ""}`;
    return await apiRequest<PaginatedItemsResponse>(`/items${query}`, {
      tenantId,
      userId,
    });
  },

  // State Machine Transition Mutator
  async triggerTransition(
    tenantId: string,
    userId: string,
    itemId: string,
    targetState: string,
  ) {
    return await apiRequest<{ message: string; data: any }>(
      `/items/transition`,
      {
        method: "POST",
        tenantId,
        userId,
        body: { itemId, targetState },
      },
    );
  },

  async resolveApproval(
    tenantId: string,
    userId: string,
    requestId: string,
    action: "APPROVED" | "REJECTED",
  ) {
    return await apiRequest<{ message: string; data: any }>(
      `/approvals/resolve`,
      {
        method: "POST",
        tenantId,
        userId,
        body: { requestId, action },
      },
    );
  },

  // Read-Only Immutable History Timeline Fetch
  async fetchAuditLogs(tenantId: string, userId: string, itemId: string) {
    return await apiRequest<{ data: AuditLog[] }>(`/audit-logs/${itemId}`, {
      tenantId,
      userId,
    });
  },

  async fetchPendingApprovals(tenantId: string, userId: string) {
    return await apiRequest<{ data: any[] }>(`/approvals/pending`, {
      tenantId,
      userId,
    });
  },


  // Dynamic item generation matching requirements
  async createItem(
    tenantId: string,
    userId: string,
    title: string,
    slaHours: number = 48,
  ) {
    return await apiRequest<{ success: boolean; data: any }>(`/items`, {
      method: "POST",
      tenantId,
      userId,
      body: { title, slaHours },
    });
  },

  // Authority delegation configuration hook
  async configureDelegation(
    tenantId: string,
    userId: string,
    toUserId: string,
    days: number = 7,
  ) {
    return await apiRequest<{ success: boolean }>(`/approvals/delegate`, {
      method: "POST",
      tenantId,
      userId,
      body: { toUserId, durationDays: days },
    });
  },

  async configureWorkflowBlueprint(
    tenantId: string,
    userId: string,
    title: string,
    states: string[],
    transitions: Array<{
      from: string;
      to: string;
      requiresApproval: boolean;
      approvalStrategy?: string;
    }>,
  ) {
    return await apiRequest<{ success: boolean; data: any }>(
      `/workflows/configure`,
      {
        method: "POST",
        tenantId,
        userId,
        body: { title, states, transitions },
      },
    );
  },
};
