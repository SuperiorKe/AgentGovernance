import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { initDb } from './db';
import { startTimeoutWorkers } from './services/timeouts';

import authRoutes from './routes/auth';
import agentsRoutes from './routes/agents';
import rulesRoutes from './routes/rules';
import governanceRoutes from './routes/governance';
import approvalsRoutes from './routes/approvals';
import outcomesRoutes from './routes/outcomes';
import auditRoutes from './routes/audit';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/agents', agentsRoutes);
app.use('/api/v1/rules', rulesRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/approvals', approvalsRoutes);
app.use('/api/v1/outcomes', outcomesRoutes);
app.use('/api/v1/audit', auditRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await initDb();
  console.log('Database initialized.');

  startTimeoutWorkers();
  console.log('Timeout workers started.');

  server.listen(PORT, () => {
    console.log(`Governance API running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
