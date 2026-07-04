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
        "Target resource item not found or sits outside of active tenant boundaries.",
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

      // Extract the manager's userId dynamically from the database record cell
      const targetApproverId = activeApproverMembership.userId;

      // Create a pending ticket entry in the database queue
      await itemRepository.createApprovalRequest(
        item.id,
        matchTransition.id,
        tenantId,
        targetApproverId,
      );

      // Mutate the parent asset state smoothly into the requested tracking column
      await itemRepository.updateStateWithOCC(
        item.id,
        item.version,
        requestedState,
      );

      await auditRepository.createLog(
        tenantId,
        item.id,
        "TRANSITION_HOLD_TRIGGERED",
        userId,
        {
          previousState: item.currentState,
          newState: requestedState,
          requiredApprover: targetApproverId,
        },
      );

      return {
        status: "PENDING_APPROVAL_HOLD",
        message: `Transition captured. State shifted to '${requestedState}'. A signature request ticket has been dispatched to authorized manager: ${targetApproverId}`,
        itemId: item.id,
      };
    }

    // Halts progression if a manager signature is required
    if (matchTransition.requiresApproval) {
      throw new Error(
        `Action Blocked. Transition to state '${requestedState}' requires an authorized manager signature verification.`,
      );
    }

    // EXECUTE DATA TRANSACTION WITH OCC CONCURRENCY LOCKS
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
