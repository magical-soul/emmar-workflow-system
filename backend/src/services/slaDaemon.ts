import { prisma } from '../utils/db';

export class SlaDaemon {
  private timerId: NodeJS.Timeout | null = null;

  public start(intervalMs: number = 60000) {
    console.log(`⏱️ SLA Lean Background Worker active. Monitoring interval: ${intervalMs}ms`);
    
    this.timerId = setInterval(async () => {
      try {
        const now = new Date();

        // Locate any items currently stuck in the PENDING_APPROVAL column
        const itemsToEscalate = await prisma.item.findMany({
          where: { currentState: 'PENDING_APPROVAL' },
          include: {
            workflow: {
              include: { transitions: true }
            }
          }
        });

        if (itemsToEscalate.length === 0) return;

        console.log(`🚨 SLA Breach Detected! Automatically escalating [${itemsToEscalate.length}] contract items...`);

        // Process each item inside an atomic transaction block to generate admin tickets
        for (const item of itemsToEscalate) {
          await prisma.$transaction(async (tx) => {
            
            // Dynamically look up the authorized ADMIN for this specific company workspace
            const tenantAdminMembership = await tx.tenantMembership.findFirst({
              where: {
                tenantId: item.tenantId,
                role: 'ADMIN'
              }
            });

            const escalatedApproverTarget = tenantAdminMembership ? tenantAdminMembership.userId : 'user-jyoti';

            // Find the transition ID corresponding to the current state route mapping
            const activeTransition = item.workflow.transitions.find(
              t => t.fromStateName === 'PENDING_APPROVAL' && t.toStateName === 'CONFIRMED'
            );

            if (activeTransition) {
              // Invalidate any old lower-level manager tickets (e.g., clearing it from Bob's inbox)
              await tx.approvalRequest.updateMany({
                where: { itemId: item.id, status: 'PENDING' },
                data: { status: 'REJECTED' }
              });

              // Spawn an active ticket explicitly assigned to Jyoti!
              await tx.approvalRequest.create({
                data: {
                  itemId: item.id,
                  transitionId: activeTransition.id,
                  tenantId: item.tenantId,
                  assignedApproverId: escalatedApproverTarget, // Routes straight to the Admin!
                  status: 'PENDING'
                }
              });
            }

            // Push the item state into ESCALATED and increment its OCC clock parameter
            await tx.item.update({
              where: { id: item.id, version: item.version },
              data: {
                currentState: 'ESCALATED',
                version: item.version + 1
              }
            });

            // Log the system escalation snap inside the audit tables
            await tx.auditLog.create({
              data: {
                tenantId: item.tenantId,
                itemId: item.id,
                action: 'SLA_BREACH_AUTOMATED_ESCALATION',
                performedBy: 'SYSTEM_DAEMON',
                payload: JSON.stringify({ escalatedToAdminId: escalatedApproverTarget })
              }
            });

          });
        }

      } catch (error: any) {
        console.error('SlaDaemon loop encountered an exception:', error.message);
      }
    }, intervalMs);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      console.log('🛑 SLA Background Daemon safely shut down.');
    }
  }
}
