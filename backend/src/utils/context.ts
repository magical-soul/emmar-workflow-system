import { Request } from 'express';

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: 'ADMIN' | 'APPROVER' | 'USER';
}

export interface AuthenticatedRequest extends Request {
  tenantContext?: TenantContext;
}
