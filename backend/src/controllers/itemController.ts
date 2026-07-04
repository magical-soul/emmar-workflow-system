import { Response } from 'express';
import { AuthenticatedRequest } from '../utils/context';
import { ItemService } from '../services/itemService';

const itemService = new ItemService();

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
