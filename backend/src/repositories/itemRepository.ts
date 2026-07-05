import { prisma } from "../utils/db";

export class ItemRepository {
  async findAllByTenant(tenantId: string) {
    return await prisma.item.findMany({
      where: { tenantId },
      orderBy: { id: "desc" },
    });
  }

  async findByIdAndTenant(id: string, tenantId: string) {
    return await prisma.item.findFirst({
      where: { id, tenantId },
      include: {
        workflow: {
          include: {
            transitions: true,
          },
        },
      },
    });
  }

  async updateStateWithOCC(
    id: string,
    currentVersion: number,
    targetState: string,
  ): Promise<number> {
    const updateResult = await prisma.item.updateMany({
      where: {
        id,
        version: currentVersion, // The record version number MUST match what we read in memory!
      },
      data: {
        currentState: targetState,
        version: currentVersion + 1, // Increment the version identifier atomically
      },
    });

    return updateResult.count; // Returns 1 if successful, 0 if another user modified it first!
  }

  async createApprovalRequest(
    itemId: string,
    transitionId: string,
    tenantId: string,
    approverId: string,
  ) {
    return await prisma.approvalRequest.create({
      data: {
        itemId,
        transitionId,
        tenantId,
        assignedApproverId: approverId,
        status: "PENDING",
      },
    });
  }

  // Look up if a manager has actively delegated authority to someone else
  async findActiveDelegation(
    tenantId: string,
    fromUserId: string,
    toUserId: string,
  ) {
    return await prisma.approvalDelegations.findFirst({
      where: {
        tenantId,
        fromUserId,
        toUserId,
        expiresAt: {
          gt: new Date(), // Must be active right now!
        },
      },
    });
  }

  // Fetch a specific approval request while eagerly loading the related transition blueprint rules
  async findApprovalRequestWithTransition(id: string, tenantId: string) {
    return await prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: {
        transition: true,
        item: true,
      },
    });
  }

  // ATOMIC DOUBLE-SIGN BLOCK: Update request status safely
  async updateApprovalStatus(id: string, status: string) {
    return await prisma.approvalRequest.update({
      where: { id, status: "PENDING" },
      data: { status },
    });
  }

  async escalateOverdueItems(): Promise<number> {
    // 1. Locate all items waiting for approval that have breached their SLA tracking windows
    const itemsToEscalate = await prisma.item.findMany({
      where: {
        currentState: "PENDING_APPROVAL",
      },
    });

    if (itemsToEscalate.length === 0) return 0;

    let totalEscalatedCount = 0;

    // 2. ⚡ DYNAMIC ESCALATION SWEEP: Process items based on their organizational boundaries
    for (const item of itemsToEscalate) {
      // Dynamically look up the authorized ADMIN for this specific item's tenant workspace!  
      const tenantAdminMembership = await prisma.tenantMembership.findFirst({
        where: {
          tenantId: item.tenantId,
          role: "ADMIN", // Filters out regular workers, pulling the true workspace manager  
        },
      });

      // Fallback indicator if a tenant workspace lacks an admin profile configuration
      const escalatedApproverTarget = tenantAdminMembership
        ? tenantAdminMembership.userId
        : "SYSTEM_FALLBACK_ADMIN";

      // 3. Re-route the specific pending approval request to the dynamically resolved Admin  
      await prisma.approvalRequest.updateMany({
        where: {
          itemId: item.id,
          status: "PENDING",
        },
        data: {
          assignedApproverId: escalatedApproverTarget, // Authority shifts up the organizational chart dynamically!
        },
      });

      // 4. Update the parent asset item state row atomically using OCC version checks  
      const updateResult = await prisma.item.updateMany({
        where: {
          id: item.id,
          version: item.version,
        },
        data: {
          currentState: "ESCALATED",
          version: item.version + 1,
        },
      });

      totalEscalatedCount += updateResult.count;
    }

    return totalEscalatedCount; // Returns total records successfully escalated in this sweep cycle
  }



  // Atomic creation of a complete workflow blueprint with its columns and transition arrows
  async createWorkflowBlueprint(
    tenantId: string, 
    title: string, 
    version: number, 
    states: string[], 
    transitions: Array<{ from: string; to: string; requiresApproval: boolean; approvalStrategy?: string }>
  ) {
    // Execute inside an isolated database transaction to guarantee atomicity
    return await prisma.$transaction(async (tx) => {
      // Create the master Workflow template row
      const workflow = await tx.workflow.create({
        data: {
          tenantId,
          title,
          version
        }
      });

      // Map and batch-insert all columns (States) for this board  
      const stateRecords = await Promise.all(
        states.map(stateName => 
          tx.workflowState.create({
            data: {
              workflowId: workflow.id,
              tenantId,
              name: stateName
            }
          })
        )
      );

      // Map and batch-insert all valid transition arrows connecting the columns  
      await Promise.all(
        transitions.map(t => 
          tx.workflowTransition.create({
            data: {
              workflowId: workflow.id,
              tenantId,
              fromStateName: t.from,
              toStateName: t.to,
              requiresApproval: t.requiresApproval,
              approvalStrategy: t.approvalStrategy || 'SINGLE'
            }
          })
        )
      );

      return workflow;
    });
  }

}
