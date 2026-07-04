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
      where: { id },
      data: { status },
    });
  }
}
