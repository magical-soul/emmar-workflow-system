import { Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { AuthenticatedRequest } from '../utils/context';

// Generic Request Validation Wrapper
export const validateBody = (schema: ZodType) => 
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({ 
        error: 'Validation Failure Exception.', 
        details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`) 
      });
    }
  };

// Explicit Input Schema Definitions
export const createWorkflowSchema = z.object({
  title: z.string().min(3).max(100),
  states: z.array(z.string().min(2)).min(2),
  transitions: z.array(z.object({
    from: z.string(),
    to: z.string(),
    requiresApproval: z.boolean(),
    approvalStrategy: z.enum(['SINGLE', 'MULTIPLE', 'QUORUM']).optional()
  })).min(1)
});

export const transitionItemSchema = z.object({
  itemId: z.string().uuid(),
  targetState: z.string().min(2)
});

export const resolveApprovalSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['APPROVED', 'REJECTED'])
});
