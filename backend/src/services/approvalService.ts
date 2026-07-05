import { itemRepository, auditRepository } from "../repositories/index";

export class ApprovalService {
  async resolveApproval(
    requestId: string,
    tenantId: string,
    currentUserId: string,
    action: "APPROVED" | "REJECTED",
  ) {
    // Fetch the signature ticket with its parent asset item attributes in one pass
    const request = await itemRepository.findApprovalRequestWithTransition(
      requestId,
      tenantId,
    );
    if (!request) {
      throw new Error(
        "Approval task ticket not found or sits outside your current tenant organization.",
      );
    }

    // THE DUPLICATE SIGNATURE GUARD: Prevent double processing or conflicting updates
    if (request.status !== "PENDING") {
      throw new Error(
        `Conflict. This approval ticket has already been processed and marked as: ${request.status}`,
      );
    }

    // THE AUTHORITY RESOLUTION MATRIX (Checking Direct Assignment or Delegation)
    let isAuthorized = request.assignedApproverId === currentUserId;

    if (!isAuthorized) {
      // Not directly assigned—check if the assigned manager delegated authority to this sender
      const activeDelegation = await itemRepository.findActiveDelegation(
        tenantId,
        request.assignedApproverId,
        currentUserId,
      );
      if (activeDelegation) {
        isAuthorized = true; // Authority granted via vacation hand-off!
      }
    }

    if (!isAuthorized) {
      throw new Error(
        "Access Denied. You are not authorized to sign off on this specific approval workflow channel.",
      );
    }

    try {
      // Execute the atomic database mutation query safely  
      await itemRepository.updateApprovalStatus(request.id, action);
    } catch (dbError) {
      // If the query fails, it means another thread updated the row a millisecond ago!  
      throw new Error(
        "Concurrency Conflict. This approval token was already resolved by another manager thread a millisecond ago. Please refresh data.",
      );
    }

    if (action === "APPROVED") {
      const targetState = request.transition.toStateName;

      const affectedRows = await itemRepository.updateStateWithOCC(
        request.item.id,
        request.item.version,
        targetState,
      );
      if (affectedRows === 0) {
        throw new Error(
          "Concurrency Conflict. The parent item profile shifted state during your transaction loop. Please reload data.",
        );
      }

      await auditRepository.createLog(
        tenantId,
        request.item.id,
        "APPROVAL_REQUEST_RESOLVED",
        currentUserId,
        {
          requestId: request.id,
          action,
          finalItemState: targetState,
          assignedApprover: request.assignedApproverId,
        },
      );

      return { status: "RESOLVED", action, currentItemState: targetState };
    }

    await auditRepository.createLog(
      tenantId,
      request.item.id,
      "APPROVAL_REQUEST_REJECTED",
      currentUserId,
      {
        requestId: request.id,
        action,
      },
    );

    // If rejected, keep the item locked in its current pending status or move back to draft rules
    return {
      status: "RESOLVED",
      action,
      currentItemState: request.item.currentState,
    };
  }
}
