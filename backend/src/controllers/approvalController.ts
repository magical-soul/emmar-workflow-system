import { Response } from "express";
import { AuthenticatedRequest } from "../utils/context";
import { approvalService } from "../services/index";

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
