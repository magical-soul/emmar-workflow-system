import { itemRepository, auditRepository } from "../repositories/index";
import { prisma } from "../utils/db";

export class WorkflowService {
  async processTransition(
    itemId: string,
    tenantId: string,
    requestedState: string,
    userId: string,
  ) {
    // Fetch the active item and its structural rules in a single optimized pass
    const item = await itemRepository.findByIdAndTenant(itemId, tenantId);
    if (!item) {
      throw new Error(
        "Target resource item not found",
      );
    }

    // Scan the transitions matrix to see if an arrow connects these boxes
    const allowedTransitions = item.workflow.transitions;
    const matchTransition = allowedTransitions.find(
      (t) =>
        t.fromStateName === item.currentState &&
        t.toStateName === requestedState,
    );

    if (!matchTransition) {
      throw new Error(
        `Invalid Transition. Cannot move item from state: '${item.currentState}' directly to target state: '${requestedState}'`,
      );
    }

    // THE APPROVAL ENGINE INTERCEPTOR
    if (matchTransition.requiresApproval) {
      const activeApproverMembership = await prisma.tenantMembership.findFirst({
        where: {
          tenantId,
          role: "APPROVER",
        },
      });

      if (!activeApproverMembership) {
        throw new Error(
          "System Exception: No qualified approvers registered inside this tenant workspace organization.",
        );
      }

      const targetApproverId = activeApproverMembership.userId;

      // Spawn the pending signature task ticket inside the database table queue
      await itemRepository.createApprovalRequest(
        item.id,
        matchTransition.id,
        tenantId,
        targetApproverId,
      );

      const finalHoldState =
        item.currentState === "DRAFT" ? "PENDING_APPROVAL" : item.currentState;
      await itemRepository.updateStateWithOCC(
        item.id,
        item.version,
        finalHoldState,
      );

      // Log the hold event in the immutable ledger
      await auditRepository.createLog(
        tenantId,
        item.id,
        "TRANSITION_HOLD_TRIGGERED",
        userId,
        {
          previousState: item.currentState,
          requestedState: requestedState,
          holdState: finalHoldState,
          requiredApprover: targetApproverId,
        },
      );

      return {
        status: "PENDING_APPROVAL_HOLD",
        message: `Action Blocked. Transition to state '${requestedState}' requires an authorized manager signature verification. A ticket has been dispatched to: ${targetApproverId}`,
        itemId: item.id,
        currentState: finalHoldState,
      };
    }

    // EXECUTE DIRECT progression DATA TRANSACTION (For un-locked paths like DRAFT -> PENDING_APPROVAL)
    const affectedRows = await itemRepository.updateStateWithOCC(
      item.id,
      item.version,
      requestedState,
    );

    if (affectedRows === 0) {
      throw new Error(
        "Concurrency Conflict. This record was updated by another system thread a millisecond ago. Please refresh state data.",
      );
    }

    // Log standard transition completion success
    await auditRepository.createLog(
      tenantId,
      item.id,
      "TRANSITION_COMPLETED",
      userId,
      {
        previousState: item.currentState,
        newState: requestedState,
      },
    );

    return {
      success: true,
      itemId: item.id,
      previousState: item.currentState,
      newState: requestedState,
    };
  }
}
