import { Response } from "express";
import { AuthenticatedRequest } from "../utils/context";
import {  auditRepository } from "../repositories/index";

export async function getItemAuditTimeline(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res
        .status(500)
        .json({ error: "Uninitialized context context exception." });
    }

    const itemId = req.params.itemId as string;
    if (!itemId) {
      return res
        .status(400)
        .json({
          error: "Parameter mapping conflict: itemId parameter is mandatory.",
        });
    }

    // Fetch history, securely wrapping the transaction inside our active tenantId filter!  
    const logs = await auditRepository.findHistoryByItem(context.tenantId, itemId);

    // Parse serialized string blobs back into native JSON objects before dispatching back to React  
    const parsedLogs = logs.map((log) => ({
      ...log,
      payload: JSON.parse(log.payload),
    }));

    return res.json({
      message: "Audit ledger timeline metrics resolved successfully.",
      itemId,
      totalEntriesCount: parsedLogs.length,
      data: parsedLogs,
    });
  } catch (error) {
    console.error("Audit ledger tracking extraction crash:", error);
    return res
      .status(500)
      .json({ error: "Failed to extract localized audit historical trails." });
  }
}
