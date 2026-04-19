import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/track', async (req, res) => {
  const { action_id, success, latency_ms, notes } = req.body;

  if (!action_id || typeof success !== 'boolean' || typeof latency_ms !== 'number') {
    return res.status(400).json({ error: 'action_id, success, latency_ms required' });
  }

  const action = await db('actions').where({ id: action_id }).first();
  if (!action) return res.status(404).json({ error: 'Action not found' });
  
  if (action.status !== 'approved' && action.status !== 'auto_approved') {
    return res.status(400).json({ error: 'Action cannot receive outcome from an unapproved state' });
  }

  const outcomeId = uuidv4();
  await db('outcomes').insert({
    id: outcomeId,
    action_id,
    success,
    latency_ms,
    notes: notes || null
  });

  res.json({ message: 'Outcome tracked', outcome_id: outcomeId });
});

export default router;
