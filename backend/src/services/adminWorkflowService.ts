import { itemRepository, auditRepository } from '../repositories/index';
import { prisma } from '../utils/db';

export class AdminWorkflowService {
  async defineNewWorkflow(
    tenantId: string, 
    title: string, 
    states: string[], 
    transitions: Array<{ from: string; to: string; requiresApproval: boolean; approvalStrategy?: string }>,
    userId: string
  ) {

    for (const transition of transitions) {
      const sourceStateExists = states.includes(transition.from);
      const targetStateExists = states.includes(transition.to);

      if (!sourceStateExists || !targetStateExists) {
        throw new Error(
          `Structural Matrix Rejection: Invalid transition configuration arrow mapped from [${transition.from}] to [${transition.to}]. Specified states must exist within the defined workspace array.`
        );
      }
    }

    // Fetch the absolute latest active version of this workflow blueprint layout
    const latestWorkflow = await prisma.workflow.findFirst({
      where: { tenantId, title },
      orderBy: { version: 'desc' },
      include: {
        states: true,
        transitions: true
      }
    });

    // Deep compare if a workflow layout already exists
    if (latestWorkflow) {
      // Do the state arrays match perfectly in length and values?
      const existingStates = latestWorkflow.states.map(s => s.name).sort();
      const incomingStates = [...states].sort();
      const statesMatch = JSON.stringify(existingStates) === JSON.stringify(incomingStates);

      // Do the transition arrows match perfectly?
      const existingTransitions = latestWorkflow.transitions.map(t => 
        `${t.fromStateName}->${t.toStateName}-${t.requiresApproval}-${t.approvalStrategy}`
      ).sort();

      const incomingTransitions = transitions.map(t => 
        `${t.from}->${t.to}-${t.requiresApproval}-${t.approvalStrategy || 'SINGLE'}`
      ).sort();

      const transitionsMatch = JSON.stringify(existingTransitions) === JSON.stringify(incomingTransitions);

      // If both components match perfectly, halt creation gracefully and return the active version!
      if (statesMatch && transitionsMatch) {
        return {
          success: true,
          workflowId: latestWorkflow.id,
          title,
          deployedVersion: latestWorkflow.version,
          message: `No changes detected. Existing Version ${latestWorkflow.version} remains active and unchanged.`
        };
      }
    }

    // If changes were detected, determine the next sequential version number
    const nextVersion = latestWorkflow ? latestWorkflow.version + 1 : 1;

    // Dispatch the new layout down to our atomic database transactions
    const newBlueprint = await itemRepository.createWorkflowBlueprint(
      tenantId,
      title,
      nextVersion,
      states,
      transitions
    );

    // Track the architectural adjustment in our immutable log files
    await auditRepository.createLog(tenantId, null, 'WORKFLOW_BLUEPRINT_CREATED', userId, {
      workflowId: newBlueprint.id,
      title,
      version: nextVersion,
      totalStatesConfigured: states.length,
      totalTransitionsConfigured: transitions.length
    });

    return {
      success: true,
      workflowId: newBlueprint.id,
      title,
      deployedVersion: nextVersion,
      message: `Workflow blueprint successfully deployed. Version ${nextVersion} is now active.`
    };
  }
}
