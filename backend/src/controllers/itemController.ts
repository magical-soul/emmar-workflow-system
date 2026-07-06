import { Response } from "express";
import { AuthenticatedRequest } from "../utils/context";
import { workflowService } from "../services/index";
import { itemRepository } from "../repositories";

export async function getTenantItems(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res
        .status(500)
        .json({ error: "Uninitialized validation context exception." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const stateFilter = req.query.state as string || undefined;

    const result = await itemRepository.findPaginatedTenantItems(
      context.tenantId,
      page,
      limit,
      stateFilter
    );

    return res.json({
      activeWorkspace: context.tenantId,
      userRoleInWorkspace: context.role,
      ...result
    });
  } catch (error) {
    console.error("Controller endpoint tracking failure:", error);
    return res
      .status(500)
      .json({ error: "Failed to resolve requested workspace resources." });
  }
}

export async function triggerItemTransition(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res
        .status(500)
        .json({ error: "Uninitialized application context exception." });
    }

    const { itemId, targetState } = req.body;
    if (!itemId || !targetState) {
      return res
        .status(400)
        .json({
          error:
            "Missing target parameters: itemId and targetState are required.",
        });
    }

    // Dispatch parameters safely down to our pure service layer
    const result = await workflowService.processTransition(
      itemId,
      context.tenantId,
      targetState,
      context.userId,
    );

    return res.json({
      message: "State transition executed successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Workflow operation runtime exception:", error.message);
    return res
      .status(400)
      .json({
        error: error.message || "Workflow transition operation failed.",
      });
  }
}


export async function createTenantItem(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext!;
    const { title, slaHours } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Validation Failure: Item title field is mandatory.' });
    }

    const newItem = await itemRepository.createNewItem(
      context.tenantId,
      title,
      context.userId,
      parseInt(slaHours) || 48
    );

    return res.json({ success: true, message: 'Asset record instantiated successfully.', data: newItem });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to instantiate new tracking asset.' });
  }
}
