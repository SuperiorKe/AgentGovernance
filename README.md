# Agent Governance Platform

An infrastructure layer providing robust, human-in-the-loop (HITL) governance, action-level rule management, and comprehensive outcome tracking for AI agents. 

This platform allows operators to safely chain AI agents (e.g. LangChain, AutoGPT) into real-world business systems while strictly monitoring their actions via deterministic rules before those actions are executed.

## Core Features

- **Zero-Trust Rule Engine**: Agents submit proposed actions to the API. If no rules match the behavior, it defaults to a `require_approval` consequence.
- **Boolean Logic Matrices**: Build highly specific governance rules with arbitrary JSON field parsing, operators (`>`, `<`, `=`, `>=`, `<=`), and numeric threshold logic.
- **Real-time HITL Dashboard**: A Socket.io-powered React frontend displaying the exact contextual reasoning and data payload of pending actions to human owners.
- **Automated Lifecycle Sweeps**: Background timeout workers actively sweep the SQLite database every 30 seconds to cull expired, unresolved approvals or failed agent outcomes.
- **Analytics & Auditing**: End-to-end transparency with a rigorous Audit Log and per-agent Performance Scorecards (tracking Success Rates, Latencies, and Acceptances).

## Architecture

This project is structured as an **NPM Monorepo workspaces** project, leveraging a robust local stack designed for rapid prototyping and drop-in extensibility.

*   **`/packages/api`**: Node.js, Express, Knex.js, SQLite, Socket.io
*   **`/packages/dashboard`**: React, Vite, Axios, Socket.io-client

---

## 🛠️ Installation & Setup

Ensure you are running **Node 20+**.

**1. Install Dependencies**
At the root directory of the monorepo, run:
```bash
npm install
```
*(This will bootstrap and map dependencies across both `api` and `dashboard` workspaces).*

**2. Start the Backend API**
```bash
cd packages/api
npm run dev
```
*(The backend will auto-initialize its SQLite schema in `packages/api/governance.sqlite` on startup and open on Port 3000).*

**3. Start the Frontend Dashboard**
Open a new terminal window:
```bash
cd packages/dashboard
npm run dev
```
*(The frontend will spin up using Vite on Port 5173).*

---

## 🔌 Using the API (Testing)

The system exposes RESTful pathways to simulate an Agent.

### 1. Mock the System
To mock up some active agents and rules, populate the sqlite tracking system by interacting with the endpoints.
```bash
# Generate a Master User API Key
POST http://localhost:3000/api/v1/auth/keys/user

# Generate an Agent tied to that Owner
POST http://localhost:3000/api/v1/auth/keys/agent
```

### 2. Request Action Governance
An AI agent attempts to perform a real-world task, so it hits the Governance Node FIRST.
```json
// POST http://localhost:3000/api/v1/governance/request
{
  "agent_id": "your-agent-id-here",
  "action_type": "price_change",
  "proposed_value": {
    "item": "Tomatoes",
    "change_percentage": 0.15
  },
  "reasoning": "Matching competitive market hike."
}
```

The system will intercept this request, apply the boolean rules, and return either `auto_approved`, `blocked`, or `pending_approval`.

If it goes to `pending_approval`, watch your local React dashboard instantly emit the request to your pending UI where you can Approve or Reject it!

---

## Roadmap / Future Iterations

- **Full Auth Verification**: Current endpoints natively generate keys but they need to be transitioned to standard bcrypt hashing schemas for production deployments.
- **Scaling Workers**: Move the DB-polling lifecycle routines to dedicated `BullMQ` + `Redis` instances to support larger scale Agent concurrency.
- **OAuth / SSO**: Introduce traditional Single Sign-On methods for team-based administrative access to the Node interface.
