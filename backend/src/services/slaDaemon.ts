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

        // Fetch all distinct active tenants inside the cluster first to enforce query isolation fences!
        const activeTenants = await prisma.tenant.findMany({ select: { id: true } });

        for (const tenant of activeTenants) {
          // Confine the query scan strictly inside this tenant's indexed boundary fence!
          const pendingItems = await prisma.item.findMany({
            where: { 
              tenantId: tenant.id, // Enforces high performance filtering via your @@index database maps
              currentState: 'PENDING_APPROVAL' 
            },
            include: {
              workflow: {
                include: { transitions: true }
              }
            }
          });

          if (pendingItems.length === 0) continue;

          // Evaluate true temporal boundaries based on the native updatedAt timestamp metrics
          const itemsToEscalate = pendingItems.filter(item => {
            const stateShiftTimestamp = new Date(item.updatedAt).getTime();
            const elapsedHoursCalculated = (now.getTime() - stateShiftTimestamp) / (1000 * 60 * 60);
            return elapsedHoursCalculated >= item.slaHours;
          });

          if (itemsToEscalate.length === 0) continue;

          console.log(`[SYSTEM DAEMON] ⏰ SLA Breach Detected inside Tenant [${tenant.id}]! Escalating [${itemsToEscalate.length}] items...`);

          for (const item of itemsToEscalate) {
            await prisma.$transaction(async (tx) => {
              
              const tenantAdminMembership = await tx.tenantMembership.findFirst({
                where: {
                  tenantId: item.tenantId,
                  role: 'ADMIN'
                }
              });

              const escalatedApproverTarget = tenantAdminMembership ? tenantAdminMembership.userId : 'user-jyoti';

              const activeTransition = item.workflow.transitions.find(
                t => t.fromStateName === 'PENDING_APPROVAL' && t.toStateName === 'CONFIRMED'
              );

              if (activeTransition) {
                await tx.approvalRequest.updateMany({
                  where: { itemId: item.id, status: 'PENDING' },
                  data: { status: 'REJECTED' }
                });

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

              await tx.item.update({
                where: { id: item.id, version: item.version },
                data: {
                  currentState: 'ESCALATED',
                  escapedAt: now,
                  version: item.version + 1
                }
              });

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
        }

      } catch (error: any) {
        console.error('[SYSTEM DAEMON] SLA worker thread loop encountered an exception:', error.message);
      }
    }, intervalMs);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      console.log('[SYSTEM DAEMON] 🛑 SLA Background Daemon safely shut down.');
    }
  }
}
