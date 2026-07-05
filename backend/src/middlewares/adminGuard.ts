import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../utils/context";

export function adminGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const context = req.tenantContext;

  // Safety check to make sure tenantGuard was executed first in the routing chain
  if (!context) {
    return res.status(500).json({ error: 'Security Exception: Router context initialization failure.' });
  }

  // THE ADMIN ROLE BARRIER: If they aren't an ADMIN, throw them out immediately!
  if (context.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access Denied. Workflow configuration changes are strictly restricted to Tenant Administrators.' 
    });
  }

  // All privileges verified. Pass execution downstream to our workflow controller configuration routes.
  next();
}
