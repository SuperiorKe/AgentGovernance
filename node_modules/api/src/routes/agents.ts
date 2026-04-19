import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const agents = await db('agents');
  res.json(agents);
});

router.get('/:agent_id/performance', async (req, res) => {
  const { agent_id } = req.params;

  const agent = await db('agents').where({ id: agent_id }).first();
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const totalActionsData = await db('actions').where({ agent_id }).count('id as count').first();
  const total_actions = totalActionsData?.count ? Number(totalActionsData.count) : 0;

  const actionsWithOutcomes = await db('actions')
    .join('outcomes', 'actions.id', 'outcomes.action_id')
    .where('actions.agent_id', agent_id)
    .select('outcomes.success');

  const totalCompleted = actionsWithOutcomes.length;
  const successes = actionsWithOutcomes.filter(o => o.success).length;
  const success_rate = totalCompleted ? successes / totalCompleted : 0;

  const latencies = await db('actions')
    .join('outcomes', 'actions.id', 'outcomes.action_id')
    .where('actions.agent_id', agent_id)
    .select('outcomes.latency_ms');

  const sumLatency = latencies.reduce((acc, curr) => acc + (curr.latency_ms || 0), 0);
  const avg_latency_ms = latencies.length ? sumLatency / latencies.length : 0;

  const approvalRequiredActions = await db('actions')
    .join('approvals', 'actions.id', 'approvals.action_id')
    .where('actions.agent_id', agent_id)
    .select('approvals.decision');

  const totalApprovals = approvalRequiredActions.length;
  const approved = approvalRequiredActions.filter(a => a.decision === 'approved').length;
  const user_acceptance_rate = totalApprovals ? approved / totalApprovals : 0;

  res.json({
    agent_id,
    agent_name: agent.name,
    total_actions,
    success_rate,
    avg_latency_ms,
    user_acceptance_rate,
    period: "all_time"
  });
});

export default router;
