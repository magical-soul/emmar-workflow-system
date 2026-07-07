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

     if (matchTransition.requiresApproval) {
      // Identify what strategic consensus model is linked to this transition arrow
      const currentStrategy = matchTransition.approvalStrategy || 'SINGLE';

      // Fetch the authorized actors registered inside this tenant workspace organization
      let targetApproversList: string[] = [];

      if (currentStrategy === 'MULTIPLE' || currentStrategy === 'QUORUM') {
        // Capture ALL members holding APPROVER or ADMIN badges!
        const workspaceMemberships = await prisma.tenantMembership.findMany({
          where: {
            tenantId,
            role: { in: ['APPROVER', 'ADMIN'] }
          },
          select: { userId: true }
        });

        targetApproversList = workspaceMemberships.map(m => m.userId);
      } else {
        // Grab the first available approver seat cleanly
        const singleApprover = await prisma.tenantMembership.findFirst({
          where: { tenantId, role: 'APPROVER' },
          select: { userId: true }
        });
        
        if (singleApprover) {
          targetApproversList = [singleApprover.userId];
        }
      }

      if (targetApproversList.length === 0) {
        throw new Error(
          "System Exception: No qualified approvers registered inside this tenant workspace organization.",
        );
      }

      // Create an independent pending signature ticket row for EACH assigned supervisor!
      for (const approverId of targetApproversList) {
        await itemRepository.createApprovalRequest(
          item.id,
          matchTransition.id,
          tenantId,
          approverId
        );
      }

      const finalHoldState =
        item.currentState === "DRAFT" ? "PENDING_APPROVAL" : item.currentState;
        
      await itemRepository.updateStateWithOCC(
        item.id,
        item.version,
        finalHoldState,
      );

      // Log the hold event in the immutable ledger with complete metadata parameters
      await auditRepository.createLog(
        tenantId,
        item.id,
        "TRANSITION_HOLD_TRIGGERED",
        userId,
        {
          previousState: item.currentState,
          requestedState: requestedState,
          holdState: finalHoldState,
          appliedStrategy: currentStrategy,
          totalSignaturesRequiredCount: targetApproversList.length,
        },
      );

      return {
        status: "PENDING_APPROVAL_HOLD",
        message: `Action Blocked. Transition to state '${requestedState}' requires advanced signature verification. [${targetApproversList.length}] manager tickets dispatched.`,
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
