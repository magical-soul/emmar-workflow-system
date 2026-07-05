import { itemRepository, auditRepository } from '../repositories/index';

export class SlaDaemon {
  private timerId: NodeJS.Timeout | null = null;

  // Initialize the automated background sweep loop  
  public start(intervalMs: number = 60000) { // Default: Runs natively once every 60 seconds  
    console.log(`SLA Background Daemon Worker initialized. Interval set to: ${intervalMs}ms`);

    this.timerId = setInterval(async () => {
      try {
        // Execute batch database escalation sweep  
        const escalatedCount = await itemRepository.escalateOverdueItems();
        
        if (escalatedCount > 0) {
          console.log(`SLA Breach Detected! Automated engine successfully escalated [${escalatedCount}] stagnant asset records.`);
          
          // Inject a systematic, immutable stamp directly into your audit table  
          await auditRepository.createLog(
            'SYSTEM_DAEMON_WORKSPACE',
            null,
            'SLA_BREACH_AUTOMATED_ESCALATION',
            'SYSTEM_DAEMON',
            { totalRecordsAffected: escalatedCount, triggeredAt: new Date() }
          );
        }
      } catch (error) {
        console.error('SLA Background evaluation loop encountered an exception:', error);
      }
    }, intervalMs);
  }

  // Gracefully terminate the background engine if the server shuts down  
  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      console.log('SLA Background Daemon safely shut down.');
    }
  }
}
