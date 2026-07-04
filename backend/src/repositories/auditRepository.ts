import { prisma } from "../utils/db";

export class AuditRepository {
  // Create an immutable audit snapshot record
  async createLog(
    tenantId: string,
    itemId: string | null,
    action: string,
    performedBy: string,
    payload: object,
  ) {
    return await prisma.auditLog.create({
      data: {
        tenantId,
        itemId,
        action,
        performedBy,
        payload: JSON.stringify(payload), // Serialize the data snapshot cleanly into a JSON text column
      },
    });
  }

  // Read-only timeline query strictly filtered inside tenant isolation bounds
  async findHistoryByItem(tenantId: string, itemId: string) {
    return await prisma.auditLog.findMany({
      where: { tenantId, itemId },
      orderBy: { createdAt: "desc" }, // Always show the most recent event at the absolute top
    });
  }
}
