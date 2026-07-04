import { ItemRepository } from '../repositories/itemRepository';

const itemRepo = new ItemRepository();

export class WorkflowService {
  async processTransition(itemId: string, tenantId: string, requestedState: string, userId: string) {
    
    // Fetch the active item and its structural rules in a single optimized pass
    const item = await itemRepo.findByIdAndTenant(itemId, tenantId);
    if (!item) {
      throw new Error('Target resource item not found or sits outside of active tenant boundaries.');
    }

    // Scan the transitions matrix to see if an arrow connects these boxes
    const allowedTransitions = item.workflow.transitions;
    const matchTransition = allowedTransitions.find(
      t => t.fromStateName === item.currentState && t.toStateName === requestedState
    );

    if (!matchTransition) {
      throw new Error(`Invalid Transition. Cannot move item from state: '${item.currentState}' directly to target state: '${requestedState}'`);
    }

    // Halts progression if a manager signature is required
    if (matchTransition.requiresApproval) {
      throw new Error(`Action Blocked. Transition to state '${requestedState}' requires an authorized manager signature verification.`);
    }

    // EXECUTE DATA TRANSACTION WITH OCC CONCURRENCY LOCKS
    const affectedRows = await itemRepo.updateStateWithOCC(item.id, item.version, requestedState);
    
    if (affectedRows === 0) {
      throw new Error('Concurrency Conflict. This record was updated by another system thread a millisecond ago. Please refresh state data.');
    }

    return { 
      success: true, 
      itemId: item.id, 
      previousState: item.currentState, 
      newState: requestedState 
    };
  }
}
