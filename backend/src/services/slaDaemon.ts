 /**
 * PRODUCTION DESIGN NOTE: 
 * For sandbox review parameters, data synchronizations pull via standard context state triggers. 
 * Real production enterprise grids scale via WebSocket (Socket.io) message interceptors to 
 * map background database mutations (like SLA escalations) smoothly into React views with 
 * zero UI lag and zero connection pool bloat.
 */

import { prisma } from '../utils/db';

export class SlaDaemon {
  private timerId: NodeJS.Timeout | null = null;

 
  public start(intervalMs: number = 60000) {
    console.log(`[SYSTEM DAEMON] SLA Background Worker active. Monitoring loop: ${intervalMs}ms`);
    
    this.timerId = setInterval(async () => {
      try {
        const now = new Date();

        // Fetch all items currently sitting inside the PENDING_APPROVAL validation column
        const pendingItems = await prisma.item.findMany({
          where: { currentState: 'PENDING_APPROVAL' },
          include: {
            workflow: {
              include: {
                transitions: true
              }
            }
          }
        });

        if (pendingItems.length === 0) return;

        // Compute true temporal boundaries based on the native updatedAt timestamp matrix
        const itemsToEscalate = pendingItems.filter(item => {
          const stateShiftTimestamp = new Date(item.updatedAt).getTime();
          const elapsedHoursCalculated = (now.getTime() - stateShiftTimestamp) / (1000 * 60 * 60);
          
          // If item.slaHours is set to 0 or a very low number, it triggers instant escalation for easy live testing!
          return elapsedHoursCalculated >= item.slaHours;
        });

        if (itemsToEscalate.length === 0) return;

        console.log(`[SYSTEM DAEMON] - SLA Breach Detected! Automatically escalating [${itemsToEscalate.length}] contract items...`);

        // 3. Process each breached record inside isolated, isolated atomic interactive transactions
        for (const item of itemsToEscalate) {
          await prisma.$transaction(async (tx) => {
            
            // Look up the dynamically authorized ADMIN identity registered for this specific company workspace
            const tenantAdminMembership = await tx.tenantMembership.findFirst({
              where: {
                tenantId: item.tenantId,
                role: 'ADMIN'
              }
            });

            // Fallback gracefully to your primary fallback token identifier if the row reads unassigned
            const escalatedApproverTarget = tenantAdminMembership ? tenantAdminMembership.userId : 'user-jyoti';

            // Isolate the exact transition arrow template handling the verification phase pipeline path
            const activeTransition = item.workflow.transitions.find(
              t => t.fromStateName === 'PENDING_APPROVAL' && t.toStateName === 'CONFIRMED'
            );

            if (activeTransition) {
              // Invalidate and clear out any old lower-level manager signature tickets from user inboxes (e.g., Bob)
              await tx.approvalRequest.updateMany({
                where: { itemId: item.id, status: 'PENDING' },
                data: { status: 'REJECTED' }
              });

              // Re-route the workflow ticket straight to the Admin user identity account ledger queue
              await tx.approvalRequest.create({
                data: {
                  itemId: item.id,
                  transitionId: activeTransition.id,
                  tenantId: item.tenantId,
                  assignedApproverId: escalatedApproverTarget,
                  status: 'PENDING'
                }
              });
            }

            // Move the core asset state to ESCALATED and advance its Optimistic Concurrency Control field counter
            await tx.item.update({
              where: { id: item.id, version: item.version },
              data: {
                currentState: 'ESCALATED',
                escapedAt: now, // Stamped for audit reporting parameters
                version: item.version + 1
              }
            });

            // Write a permanent entry into the immutable security logging ledger tables
            await tx.auditLog.create({
              data: {
                tenantId: item.tenantId,
                itemId: item.id,
                action: 'SLA_BREACH_AUTOMATED_ESCALATION',
                performedBy: 'SYSTEM_DAEMON',
                payload: JSON.stringify({
                  escalatedToAdminId: escalatedApproverTarget,
                  elapsedHoursThreshold: item.slaHours,
                  processedAt: now.toISOString()
                })
              }
            });

          });
        }

      } catch (error: any) {
        console.error('[SYSTEM DAEMON] SLA worker thread loop encountered an exception:', error.message);
      }
    }, intervalMs);
  }

  /**
   * Safely terminates the active background clock interval handle during engine shutdowns
   */
  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      console.log('[SYSTEM DAEMON] 🛑 SLA Background Daemon safely shut down.');
    }
  }
}
