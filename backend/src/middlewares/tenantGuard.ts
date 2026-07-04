import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../utils/context';
import { prisma } from '../utils/db';

export async function tenantGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Extract the active tenant workspace header sent from the React UI dashboard
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // we extract a mock user ID sent from the headers to test permissions locally.
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({ 
        error: 'Missing security markers. Access requires explicit x-tenant-id and x-user-id headers.' 
      });
    }

    // Query our relational database membership table to verify access rights
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId }
      }
    });

    // If no matching row exists, block access instantly!
    if (!membership) {
      return res.status(403).json({ 
        error: `Access Denied. Current user possesses zero authorized credentials for: ${tenantId}` 
      });
    }

    // Mount the clean, verified security context parameters into the request wrapper securely
    req.tenantContext = {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role as 'ADMIN' | 'APPROVER' | 'USER'
    };

    next();
  } catch (error) {
    console.error('Tenant validation intercept system exception:', error);
    return res.status(500).json({ error: 'Internal security infrastructure validation failure.' });
  }
}
