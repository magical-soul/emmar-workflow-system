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
        version: currentVersion, // The record version number must match what we read in memory!
      },
      data: {
        currentState: targetState,
        version: currentVersion + 1, // Increment the version identifier atomically
      },
    });

    return updateResult.count; // Returns 1 if successful, 0 if another user modified it first!
  }

  async findPaginatedTenantItems(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    stateFilter?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereCondition: any = { tenantId };
    if (stateFilter) {
      whereCondition.currentState = stateFilter;
    }

    const [
      items,
      totalRecordsCount,
      draftCount,
      pendingCount,
      confirmedCount,
      escalatedCount,
    ] = await prisma.$transaction([
      prisma.item.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          workflow: { select: { title: true, version: true, transitions: true } },
           _count: {
            select: {
              requests: {
                where: { status: 'APPROVED' }
              }
            }
          }
        },
      }),
      prisma.item.count({ where: whereCondition }),
      prisma.item.count({ where: { tenantId, currentState: "DRAFT" } }),
      prisma.item.count({
        where: { tenantId, currentState: "PENDING_APPROVAL" },
      }),
      prisma.item.count({ where: { tenantId, currentState: "CONFIRMED" } }),
      prisma.item.count({ where: { tenantId, currentState: "ESCALATED" } }),
    ]);

    return {
      items,
      meta: {
        totalRecordsCount,
        currentPage: page,
        totalPagesCount: Math.ceil(totalRecordsCount / limit),
        limit,
        globalCounts: {
          DRAFT: draftCount,
          PENDING_APPROVAL: pendingCount,
          CONFIRMED: confirmedCount,
          ESCALATED: escalatedCount,
        },
      },
    };
  }

  // For tracking multi-signature strategy counts
  async countResolvedSignatures(
    itemId: string,
    transitionId: string,
  ): Promise<{ approved: number; totalCount: number }> {
    const requests = await prisma.approvalRequest.findMany({
      where: { itemId, transitionId },
    });

    const approved = requests.filter((r) => r.status === "APPROVED").length;
    return {
      approved,
      totalCount: requests.length,
    };
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
          gt: new Date(),
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

  async updateApprovalStatus(id: string, status: string) {
    return await prisma.approvalRequest.update({
      where: { id, status: "PENDING" },
      data: { status },
    });
  }

  // Atomic creation of a complete workflow blueprint with its columns and transition arrows
  async createWorkflowBlueprint(
    tenantId: string,
    title: string,
    version: number,
    states: string[],
    transitions: Array<{
      from: string;
      to: string;
      requiresApproval: boolean;
      approvalStrategy?: string;
    }>,
  ) {
    // Execute inside an isolated database transaction to guarantee atomicity
    return await prisma.$transaction(async (tx) => {
      // Create the master Workflow template row
      const workflow = await tx.workflow.create({
        data: {
          tenantId,
          title,
          version,
        },
      });

      // Map and batch-insert all columns (States) for this board
      const stateRecords = await Promise.all(
        states.map((stateName) =>
          tx.workflowState.create({
            data: {
              workflowId: workflow.id,
              tenantId,
              name: stateName,
            },
          }),
        ),
      );

      // Map and batch-insert all valid transition arrows connecting the columns
      await Promise.all(
        transitions.map((t) =>
          tx.workflowTransition.create({
            data: {
              workflowId: workflow.id,
              tenantId,
              fromStateName: t.from,
              toStateName: t.to,
              requiresApproval: t.requiresApproval,
              approvalStrategy: t.approvalStrategy || "SINGLE",
            },
          }),
        ),
      );

      return workflow;
    });
  }

  async findPendingApprovalRequests(tenantId: string, approverId: string) {
    // Locate any active managers who have delegated their signature powers to this user
    const activeDelegationsToUser = await prisma.approvalDelegations.findMany({
      where: {
        tenantId,
        toUserId: approverId,
        expiresAt: { gt: new Date() }, // Checks that the delegation window hasn't expired yet
      },
    });

    // Extract the user IDs of the managers who handed off authority
    const delegatorUserIds = activeDelegationsToUser.map((d) => d.fromUserId);

    // Query requests where the ticket is assigned directly to this user OR assigned to any of their delegators
    return await prisma.approvalRequest.findMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { assignedApproverId: approverId },
          { assignedApproverId: { in: delegatorUserIds } },
        ],
      },
      include: {
        item: { select: { title: true, currentState: true } },
      },
    });
  }

  async createNewItem(
    tenantId: string,
    title: string,
    createdBy: string,
    slaHours: number,
    workflowTitle: string
  ) {
    // Dynamically look up the active workflow configuration for this tenant
    const activeWorkflow = await prisma.workflow.findFirst({
      where: { tenantId , title: workflowTitle, isActive: true },
      orderBy: { version: "desc" },
    });

    if (!activeWorkflow) {
      throw new Error(
        "System Exception: No active workflow blueprints deployed inside this tenant workspace.",
      );
    }

    return await prisma.item.create({
      data: {
        tenantId,
        workflowId: activeWorkflow.id,
        title,
        createdBy,
        currentState: "DRAFT",
        version: 1,
        slaHours,
      },
    });
  }

  async createApprovalDelegation(
    tenantId: string,
    fromUserId: string,
    toUserId: string,
    durationDays: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return await prisma.approvalDelegations.create({
      data: {
        tenantId,
        fromUserId,
        toUserId,
        expiresAt,
      },
    });
  }

  async hasUserAlreadyVoted(
    itemId: string,
    transitionId: string,
    userId: string,
  ): Promise<boolean> {
    const existingVote = await prisma.approvalRequest.findFirst({
      where: {
        itemId,
        transitionId,
        assignedApproverId: userId,
        status: { in: ["APPROVED", "REJECTED"] },
      },
    });

    return !!existingVote; 
  }
}
