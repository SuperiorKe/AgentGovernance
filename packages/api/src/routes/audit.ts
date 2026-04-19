import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const agent_id = req.query.agent_id as string;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const auditLogs = await db('actions')
    .leftJoin('approvals', 'actions.id', 'approvals.action_id')
    .leftJoin('users', 'approvals.approver_id', 'users.id')
    .select(
      'actions.id as action_id',
      'actions.action_type',
      'actions.proposed_value',
      'actions.status',
      'users.name as decided_by',
      'actions.reasoning',
      'actions.created_at',
      'actions.resolved_at'
    )
    .where('actions.agent_id', agent_id)
    .orderBy('actions.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  auditLogs.forEach(log => {
    try {
      if (typeof log.proposed_value === 'string') {
        log.proposed_value = JSON.parse(log.proposed_value);
      }
    } catch {}
  });

  res.json(auditLogs);
});

export default router;
