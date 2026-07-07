import { useState } from 'react';
import { apiService } from '../services/apiService';
import { useWorkspace } from '../context/WorkspaceContext';

export function useAdminWorkflow(onMutationSuccess?: () => Promise<void>) {
  const { activeTenantId, activeUserId } = useWorkspace();
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleDeployBlueprint = async (
    title: string,
    states: string[],
    transitions: Array<{ from: string; to: string; requiresApproval: boolean; approvalStrategy?: string }>
  ) => {
    try {
      setAdminError(null);
      const response: any = await apiService.configureWorkflowBlueprint(activeTenantId, activeUserId, title, states, transitions);
      alert(`System Confirmation: ${response.data.message}`);
      if (onMutationSuccess) await onMutationSuccess();
    } catch (err: any) {
      setAdminError(err.message || 'Workflow blueprint deployment rejected by system validation engines.');
      throw err;
    }
  };

  return {
    adminError,
    setAdminError,
    handleDeployBlueprint
  };
}
