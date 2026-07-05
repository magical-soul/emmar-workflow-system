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

    // Prevent double processing or conflicting updates
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

    // ATOMIC HIGH-CONCURRENCY WRITE LOCK
    try {
      // Execute the atomic database mutation query safely
      await itemRepository.updateApprovalStatus(request.id, action);
    } catch (dbError) {
      // If the query fails, it means another thread updated the row a millisecond ago!
      throw new Error(
        "Concurrency Conflict. This approval token was already resolved by another manager thread a millisecond ago. Please refresh data.",
      );
    }

    // IF THE MANAGER MARKS IT REJECTED, TERMINATE PROCESS IMMEDIATELY
    if (action === "REJECTED") {
      await auditRepository.createLog(
        tenantId,
        request.itemId,
        "APPROVAL_REQUEST_REJECTED",
        currentUserId,
        {
          requestId: request.id,
          action,
        },
      );

      return {
        status: "RESOLVED",
        action,
        currentItemState: request.item.currentState,
        strategyUnlocked: false,
      };
    }

    const strategy = request.transition.approvalStrategy; // 'SINGLE' | 'MULTIPLE' | 'QUORUM'
    const counts = await itemRepository.countResolvedSignatures(
      request.itemId,
      request.transitionId,
    );

    let strategySatisfied = false;

    if (strategy === "SINGLE" || !strategy) {
      strategySatisfied = true; // A single manager signature unlocks the step path!
    } else if (strategy === "MULTIPLE") {
      // Unanimous Rule: All generated tickets for this workflow step must read APPROVED!
      strategySatisfied = counts.approved === counts.totalCount;
    } else if (strategy === "QUORUM") {
      // Majority Rule: Total valid approved signatures must exceed 50% of total board seats!
      const requiredQuorumCount = Math.floor(counts.totalCount / 2) + 1;
      strategySatisfied = counts.approved >= requiredQuorumCount;
    }

    // IF THE STRATEGY CRITERIA PATTERNS ARE FULLY MET, UPGRADE THE PARENT ITEM (OCC)
    if (strategySatisfied) {
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
          appliedStrategy: strategy,
        },
      );

      return {
        status: "RESOLVED",
        action,
        currentItemState: targetState,
        strategyUnlocked: true,
      };
    }

    // STILL WAITING: If more signatures are needed under MULTIPLE/QUORUM, freeze the item state!
    await auditRepository.createLog(
      tenantId,
      request.item.id,
      "APPROVAL_SIGNATURE_REGISTERED_WAITING",
      currentUserId,
      {
        requestId: request.id,
        action,
        approvedCount: counts.approved,
        totalRequiredCount: counts.totalCount,
        appliedStrategy: strategy,
      },
    );

    return {
      status: "WAITING_FOR_ADDITIONAL_SIGNATURES",
      action,
      currentItemState: request.item.currentState,
      strategyUnlocked: false,
    };
  }
}
