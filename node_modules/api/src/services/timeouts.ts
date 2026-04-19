import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

const OUTCOME_TIMEOUT_MS = 2 * 60 * 60 * 1000;  // 2 hours

export function startTimeoutWorkers() {
  // Check for expired pending approvals every 30 seconds
  setInterval(async () => {
    try {
      const expiredActions = await db('actions')
        .where('status', 'pending')
        .andWhere('timeout_at', '<=', db.fn.now());

      for (const action of expiredActions) {
        await db('actions').where('id', action.id).update({
          status: 'timed_out',
          resolved_at: db.fn.now()
        });
        console.log(`Action ${action.id} timed out waiting for approval.`);
      }
    } catch (err) {
      console.error('Error processing approval timeouts', err);
    }
  }, 30 * 1000);

  // Check for missing outcomes every 30 seconds
  setInterval(async () => {
    try {
      const cutoffDate = new Date(Date.now() - OUTCOME_TIMEOUT_MS).toISOString();
      
      const missingOutcomes = await db('actions')
        .where('status', 'approved')
        .andWhere('resolved_at', '<=', cutoffDate)
        .whereNotExists(
          db('outcomes').whereRaw('outcomes.action_id = actions.id')
        );

      for (const action of missingOutcomes) {
        await db('outcomes').insert({
          id: uuidv4(),
          action_id: action.id,
          success: false,
          latency_ms: OUTCOME_TIMEOUT_MS,
          notes: 'Agent execution timed out / crashed without reporting outcome',
          recorded_at: db.fn.now()
        });
        console.log(`Action ${action.id} marked as failed due to missing outcome.`);
      }
    } catch (err) {
      console.error('Error processing outcome timeouts', err);
    }
  }, 30 * 1000);
}
