import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/pending', async (req, res) => {
  const actions = await db('actions')
    .join('agents', 'actions.agent_id', 'agents.id')
    .select('actions.*', 'agents.name as agent_name')
    .where({ 'actions.status': 'pending' });

  actions.forEach(a => {
    try {
      if (typeof a.proposed_value === 'string') {
        a.proposed_value = JSON.parse(a.proposed_value);
      }
    } catch {}
  });

  res.json(actions);
});

router.post('/decision', async (req, res) => {
  const { action_id, decision, reason, approver_id } = req.body;

  if (!action_id || !decision || !approver_id) {
    return res.status(400).json({ error: 'action_id, decision, approver_id required' });
  }
  if (decision === 'rejected' && !reason) {
    return res.status(400).json({ error: 'reason required for rejection' });
  }

  const action = await db('actions').where({ id: action_id, status: 'pending' }).first();
  if (!action) return res.status(404).json({ error: 'Pending action not found' });

  await db('approvals').insert({
    id: uuidv4(),
    action_id,
    approver_id,
    decision,
    reason: reason || null
  });

  await db('actions').where({ id: action_id }).update({
    status: decision === 'approved' ? 'approved' : 'rejected',
    resolved_at: db.fn.now()
  });

  const io = req.app.get('io');
  io.emit('approval_handled', { action_id, decision });

  res.json({
    action_id,
    decision,
    recorded_at: new Date().toISOString()
  });
});

export default router;
