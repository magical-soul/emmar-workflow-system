import { Response } from "express";
import { AuthenticatedRequest } from "../utils/context";
import { approvalService } from "../services/index";
import { auditRepository, itemRepository } from "../repositories";

export async function processApprovalAction(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res
        .status(500)
        .json({ error: "Uninitialized validation context parameters." });
    }

    const { requestId, action } = req.body;
    if (!requestId || !action || !["APPROVED", "REJECTED"].includes(action)) {
      return res
        .status(400)
        .json({
          error:
            "Missing or invalid body fields. requestId and action (APPROVED/REJECTED) are mandatory.",
        });
    }

    const result = await approvalService.resolveApproval(
      requestId,
      context.tenantId,
      context.userId,
      action,
    );

    return res.json({
      message: "Approval processing sequence executed successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error(
      "Approval lifecycle processing runtime exception:",
      error.message,
    );
    return res
      .status(400)
      .json({
        error: error.message || "Failed to process workspace approval token.",
      });
  }
}

export async function getPendingUserApprovals(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext!;
    
    // Dynamically retrieve tickets based on the user header context sent from React UI 
    const requests = await itemRepository.findPendingApprovalRequests(context.tenantId, context.userId);
    
    return res.json({ success: true, data: requests });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to synchronize workspace signature task streams.' });
  }
}

export async function createTenantDelegation(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext!;
    const { toUserId, durationDays } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: 'Validation Failure: The target delegate user ID parameter is mandatory.' });
    }

    if (context.userId === toUserId) {
      return res.status(400).json({ error: 'Invalid Operation: You cannot delegate authority to yourself.' });
    }

    // Write the delegation record atomically to PostgreSQL storage
    const delegation = await itemRepository.createApprovalDelegation(
      context.tenantId,
      context.userId,
      toUserId,
      parseInt(durationDays) || 7
    );

    // Record this inside our immutable audit ledger logs
    await auditRepository.createLog(
      context.tenantId,
      null,
      'APPROVAL_AUTHORITY_DELEGATED',
      context.userId,
      { delegatedToUserId: toUserId, durationDays: durationDays || 7 }
    );

    return res.json({ success: true, message: 'Authority delegation registered successfully.', data: delegation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to instantiate signature delegation parameters.' });
  }
}
