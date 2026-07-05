export interface Item {
  id: string;
  tenantId: string;
  workflowId: string;
  currentState: 'DRAFT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'ESCALATED';
  title: string;
  createdBy: string;
  version: number;
  slaHours: number;
}

export interface ApprovalRequest {
  id: string;
  itemId: string;
  transitionId: string;
  tenantId: string;
  assignedApproverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AuditLog {
  id: string;
  tenantId: string;
  itemId: string | null;
  action: string;
  performedBy: string;
  payload: any;
  createdAt: string;
}
