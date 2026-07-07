import { Response } from 'express';
import { AuthenticatedRequest } from '../utils/context';
import { adminWorkflowService } from '../services/index';
import { prisma } from '../utils/db';

export async function createNewTenantWorkflow(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext!;
    const { title, states, transitions } = req.body;

    // Strict input shape validations  
    if (!title || !Array.isArray(states) || !Array.isArray(transitions)) {
      return res.status(400).json({ 
        error: 'Invalid Payload Payload Structure. title (string), states (array), and transitions (array) are mandatory layout fields.' 
      });
    }

    const result = await adminWorkflowService.defineNewWorkflow(
      context.tenantId,
      title,
      states,
      transitions,
      context.userId
    );

    return res.json({ message: 'Blueprint operational matrix synchronized successfully.', data: result });
  } catch (error: any) {
    console.error('Admin workflow configuration runtime crash:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to initialize tenant workflow structural templates.' });
  }
}

export async function getActiveTenantWorkflows(req: AuthenticatedRequest, res: Response) {
  try {
    const context = req.tenantContext!;

    // Only pull records belonging to the active tenant!
    const activeWorkflows = await prisma.workflow.findMany({
      where: { 
        tenantId: context.tenantId 
      },
      select: {
        title: true
      }
    });

    return res.json({ success: true, data: activeWorkflows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
