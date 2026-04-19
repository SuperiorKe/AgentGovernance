import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/', async (req, res) => {
  const { agent_id, action_type, condition, consequence } = req.body;
  if (!agent_id || !action_type || !condition || !consequence) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ruleId = uuidv4();
  await db('rules').insert({
    id: ruleId,
    agent_id,
    action_type,
    condition: JSON.stringify(condition),
    consequence
  });

  res.json({ message: 'Rule created', ruleId });
});

router.get('/', async (req, res) => {
  const { agent_id } = req.query;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

  const rules = await db('rules').where({ agent_id });
  res.json(rules);
});

export default router;
