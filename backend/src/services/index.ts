import { WorkflowService } from "./workflowService";
import { ApprovalService } from "./approvalService";
import { ItemService } from "./itemService";
import { AdminWorkflowService } from "./adminWorkflowService";

export const workflowService = new WorkflowService();
export const approvalService = new ApprovalService();
export const itemService = new ItemService();
export const adminWorkflowService = new AdminWorkflowService(); 
