import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// MVP Auth: We are keeping it very lean. Hardcoded to create a user and agent key directly.
router.post('/keys/user', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  // 1. Create User
  const userId = uuidv4();
  await db('users').insert({
    id: userId,
    name,
    email,
    role: 'owner'
  });

  // 2. Generate Key
  const rawKey = `gov_user_${crypto.randomBytes(16).toString('hex')}`;
  
  await db('api_keys').insert({
    id: uuidv4(),
    owner_id: userId,
    key_hash: rawKey, // In MVP, storing plaintext for easy checking. In production, bcrypt it.
    key_hint: rawKey.slice(-4)
  });

  res.json({ message: 'User API Key created', userId, key: rawKey });
});

router.post('/keys/agent', async (req, res) => {
  const { name, framework, ownerId } = req.body;
  if (!name || !ownerId) return res.status(400).json({ error: 'name, ownerId required' });

  const agentId = uuidv4();
  await db('agents').insert({
    id: agentId,
    name,
    framework: framework || 'langchain',
    owner_id: ownerId
  });

  const rawKey = `gov_agent_${crypto.randomBytes(16).toString('hex')}`;
  
  await db('api_keys').insert({
    id: uuidv4(),
    agent_id: agentId,
    key_hash: rawKey,
    key_hint: rawKey.slice(-4)
  });

  res.json({ message: 'Agent API Key created', agentId, key: rawKey });
});

export default router;
