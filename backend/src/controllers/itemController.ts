import { Response } from 'express';
import { AuthenticatedRequest } from '../utils/context';
import { ItemService } from '../services/itemService';
import { WorkflowService } from '../services/workflowService';

const itemService = new ItemService();
const workflowService = new WorkflowService();

export async function getTenantItems(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res.status(500).json({ error: 'Uninitialized validation context exception.' });
    }

    const items = await itemService.getTenantInventory(context.tenantId);

    return res.json({
      activeWorkspace: context.tenantId,
      userRoleInWorkspace: context.role,
      data: items
    });
  } catch (error) {
    console.error('Controller endpoint tracking failure:', error);
    return res.status(500).json({ error: 'Failed to resolve requested workspace resources.' });
  }
}

export async function triggerItemTransition(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext;
    if (!context) {
      return res.status(500).json({ error: 'Uninitialized application context exception.' });
    }

    const { itemId, targetState } = req.body;
    if (!itemId || !targetState) {
      return res.status(400).json({ error: 'Missing target parameters: itemId and targetState are required.' });
    }

    // Dispatch parameters safely down to our pure business service layer
    const result = await workflowService.processTransition(
      itemId,
      context.tenantId,
      targetState,
      context.userId
    );

    return res.json({ 
      message: 'State transition executed successfully.', 
      data: result 
    });
  } catch (error: any) {
    console.error('Workflow operation runtime exception:', error.message);
    return res.status(400).json({ error: error.message || 'Workflow transition operation failed.' });
  }
}
