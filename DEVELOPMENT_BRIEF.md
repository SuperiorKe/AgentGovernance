# Agent Governance Platform - Development Brief

## What It Is

A lightweight infrastructure layer that sits between AI agents and real-world systems, providing **zero-trust governance** for agent actions. Think of it as a policy enforcement and human-in-the-loop (HITL) approval system that intercepts agent decisions before they execute.

**Core Value Proposition**: Safely deploy AI agents in production by ensuring every action is either auto-approved by rules, explicitly blocked, or routed to a human for review.

## The Problem It Solves

When teams deploy AI agents (LangChain, AutoGPT, CrewAI, custom agents) into live business workflows, they face four critical gaps:

1. **No action boundaries** - Agents can do anything their API keys allow
2. **No approval workflows** - High-stakes decisions execute without human oversight
3. **No audit trail** - Can't answer "why did the agent do that?"
4. **No outcome tracking** - Can't measure if agent actions actually worked

This platform solves all four.

## How It Works

### The Flow

```
┌─────────────┐
│  AI Agent   │ 1. Proposes action
│ (LangChain) │────────────────────┐
└─────────────┘                    │
                                   ▼
                         ┌──────────────────┐
                         │ Governance API   │
                         │  (Rules Engine)  │
                         └──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────┐
            │ Auto-Approve │ │  Block   │ │ Pending  │
            └──────────────┘ └──────────┘ └──────────┘
                    │                            │
                    │                            ▼
                    │                   ┌────────────────┐
                    │                   │  Socket.io     │
                    │                   │  Notification  │
                    │                   └────────────────┘
                    │                            │
                    │                            ▼
                    │                   ┌────────────────┐
                    │                   │ Human Reviews  │
                    │                   │  in Dashboard  │
                    │                   └────────────────┘
                    │                            │
                    └────────────────────────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │ Agent Executes   │
                         │ Reports Outcome  │
                         └──────────────────┘
```

### Step-by-Step

1. **Agent requests permission**
   - POSTs to `/api/v1/governance/request`
   - Payload: `{ agent_id, action_type, proposed_value, reasoning }`

2. **Rules engine evaluates**
   - Matches `agent_id` + `action_type` against stored rules
   - Tests `proposed_value` against boolean conditions (AND/OR logic, operators: `>`, `<`, `=`, `contains`, etc.)
   - Returns consequence: `auto_approve`, `block`, or `require_approval`
   - **Zero-trust default**: No matching rules → `require_approval`

3. **Routing decision**
   - **Auto-approved**: Agent proceeds immediately
   - **Blocked**: Agent receives rejection
   - **Pending**: Emits Socket.io event to dashboard, starts 2-hour timeout

4. **Human review (if pending)**
   - Dashboard displays action context + reasoning
   - Human approves or rejects
   - Decision logged to `approvals` table

5. **Agent executes and reports**
   - Agent performs the approved action
   - Reports outcome: `{ success, latency_ms, notes }`
   - Outcome logged for analytics

### Key Mechanisms

**Rules Engine**
- JSON-based conditions with nested boolean logic
- Severity-based priority: `block` > `require_approval` > `auto_approve`
- When multiple rules match, most restrictive wins

**Timeout Workers**
- Background sweeps every 30 seconds
- Marks pending approvals as `timed_out` after 2 hours
- Creates failure outcomes for agents that never report back

**Real-Time Notifications**
- Socket.io connection between API and dashboard
- Instant push of pending actions to human reviewers
- No polling required

## Tech Stack

### Backend (`/packages/api`)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20+ | Server environment |
| Framework | Express.js | REST API endpoints |
| Database | SQLite | Persistence (MVP), Knex.js for queries |
| Real-time | Socket.io | Push notifications to dashboard |
| Dev Server | nodemon + ts-node | Hot reload during development |
| Language | TypeScript | Type safety |

**Database Schema**: 7 tables
- `users`, `agents`, `api_keys` (identity/auth)
- `rules` (governance policies)
- `actions` (agent requests)
- `approvals` (human decisions)
- `outcomes` (execution results)

### Frontend (`/packages/dashboard`)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19 | UI components |
| Build Tool | Vite 8 | Fast dev server + bundling |
| HTTP Client | Axios | API requests |
| Real-time | Socket.io-client | Live approval notifications |
| Routing | React Router v7 | Page navigation |
| Language | TypeScript | Type safety |
| Linter | ESLint 9 | Code quality |

### Monorepo Structure

- **NPM Workspaces** for dependency management
- Shared `node_modules` at root
- Independent `package.json` per workspace

### Future Stack (Roadmap)

Placeholders exist in `docker-compose.yml`:
- PostgreSQL 15 (replace SQLite for scale)
- Redis 7 (cache + BullMQ job queues)

## Running the System

**Install**
```bash
npm install  # from root
```

**Start Backend**
```bash
cd packages/api
npm run dev  # Runs on port 3000
```
- Auto-creates `governance.sqlite`
- Initializes schema on first run
- Starts timeout workers

**Start Frontend**
```bash
cd packages/dashboard
npm run dev  # Runs on port 5173
```

**Test the Governance Flow**
```bash
# 1. Create user key
curl -X POST http://localhost:3000/api/v1/auth/keys/user

# 2. Create agent key
curl -X POST http://localhost:3000/api/v1/auth/keys/agent

# 3. Request action governance
curl -X POST http://localhost:3000/api/v1/governance/request \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your-agent-uuid",
    "action_type": "price_change",
    "proposed_value": {
      "item": "Tomatoes",
      "change_percentage": 0.15
    },
    "reasoning": "Market price adjustment"
  }'

# 4. Watch dashboard for pending approval
```

## Current State (MVP)

**What Works**
- ✅ Zero-trust rule evaluation with boolean logic
- ✅ Real-time approval notifications via Socket.io
- ✅ Auto-approval, blocking, and HITL workflows
- ✅ Timeout sweeps for expired approvals and missing outcomes
- ✅ Full audit log (actions, approvals, outcomes)
- ✅ SQLite persistence with Knex migrations on startup

**What's Minimal**
- ⚠️ Authentication: API keys are generated but not bcrypt-hashed
- ⚠️ No auth middleware protecting endpoints (trust model for MVP)
- ⚠️ Timeout sweeps use 30-second polling (not event-driven)
- ⚠️ No dashboard authentication (open access)

**Not Yet Built**
- ❌ Analytics dashboard (success rates, latency charts, agent scorecards)
- ❌ PostgreSQL migration
- ❌ BullMQ job queues for workers
- ❌ OAuth/SSO for team access
- ❌ Rate limiting or DDoS protection

## Integration Pattern

For an agent to use this platform:

```typescript
// Before executing any real-world action
const response = await governanceAPI.requestAction({
  agent_id: 'my-agent-uuid',
  action_type: 'send_email',
  proposed_value: { to: 'user@example.com', subject: 'Hello' },
  reasoning: 'User requested weekly report'
});

if (response.decision === 'auto_approved') {
  // Execute immediately
  await sendEmail(...);
  await governanceAPI.reportOutcome({ success: true, latency_ms: 1200 });
  
} else if (response.decision === 'pending_approval') {
  // Wait for human decision (poll or webhook)
  await waitForApproval(response.action_id);
  await sendEmail(...);
  
} else {
  // Blocked - do not execute
  console.log('Action blocked by policy');
}
```

## Key Files for Development

| File | Purpose |
|------|---------|
| `packages/api/src/index.ts` | Express app setup, Socket.io init |
| `packages/api/src/db.ts` | Schema definitions, Knex config |
| `packages/api/src/services/rulesEngine.ts` | Core governance logic |
| `packages/api/src/services/timeouts.ts` | Background worker loops |
| `packages/api/src/routes/governance.ts` | Main agent-facing endpoint |
| `packages/dashboard/src/App.tsx` | React UI entry point |

## Questions for the Team

1. **Scale targets**: How many agents? How many actions/second?
2. **Authentication**: Stick with API keys or move to OAuth immediately?
3. **Database**: When to migrate SQLite → PostgreSQL?
4. **Deployment**: Docker Compose, Kubernetes, or serverless?
5. **Webhooks**: Should we push approval decisions instead of polling?

---

**Last Updated**: April 2026  
**Status**: MVP - Feature Complete, Production Hardening Needed
