import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { evaluateActionRules } from '../services/rulesEngine';

const router = Router();

router.post('/request', async (req, res) => {
  const { agent_id, action_type, proposed_value, reasoning } = req.body;

  if (!agent_id || !action_type || !proposed_value) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { consequence, ruleMatchedId } = await evaluateActionRules(agent_id, action_type, proposed_value);

  let status = 'pending';
  if (consequence === 'auto_approve') status = 'auto_approved';
  if (consequence === 'block') status = 'blocked';

  const actionId = uuidv4();
  let timeoutAt = null;
  if (status === 'pending') {
    timeoutAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  await db('actions').insert({
    id: actionId,
    agent_id,
    action_type,
    proposed_value: JSON.stringify(proposed_value),
    reasoning: reasoning || '',
    rule_matched_id: ruleMatchedId,
    status,
    timeout_at: timeoutAt
  });

  if (status === 'pending') {
    const io = req.app.get('io');
    io.emit('new_approval_request', { actionId, agent_id, action_type, proposed_value, reasoning });
  }

  res.json({
    action_id: actionId,
    decision: status === 'pending' ? 'pending_approval' : status,
    message: status === 'pending' ? 'Action queued for owner review' : `Action ${status}`,
    timeout_at: timeoutAt
  });
});

export default router;
