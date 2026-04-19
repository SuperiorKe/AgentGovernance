# Agent Governance Platform — Master Context Briefing
> **For:** Antigravity (agentic development agent)
> **Author:** Kenn (SuperiaTech)
> **Purpose:** Build the MVP of an agent governance and management platform
> **Date:** April 2026

---

## 1. Project Overview

### What We Are Building
A backend API platform that acts as a **governance and management layer for AI agents**. It sits between an agent and the real world — intercepting actions before they execute, applying policy rules, routing approvals to the right humans, logging every decision, and tracking outcomes over time.

This platform is **not** an AI agent itself. It is the **operating system for agents** — the infrastructure that makes multi-agent systems trustworthy, auditable, and manageable.

### The Core Problem It Solves
When teams deploy AI agents in production, they currently have no clean way to:
- Define what each agent is and isn't allowed to do
- Get human sign-off on high-stakes actions before they execute
- Audit every decision an agent made and why
- Measure whether agent recommendations actually worked

This platform solves all four.

### Target Users (MVP)
- Indie developers and small teams running agents in real workflows
- The primary reference use case is **Mama Mboga** — a WhatsApp-based business coaching system for informal market vendors in Nairobi, using LangChain agents, WhatsApp Cloud API, and Google Sheets

---

## 2. Guiding Principles

1. **Framework agnostic** — any agent (LangChain, CrewAI, custom) integrates with minimal change
2. **API-first** — everything is exposed via REST; the dashboard consumes the same API
3. **Simple before clever** — readable, maintainable code over optimised abstractions
4. **Action-level governance** — rules and approvals apply to specific actions, not whole agents
5. **Audit by default** — every action, decision, approval, and outcome is logged
6. **Lean MVP** — ship governance + approvals + basic measurement; nothing more

---

## 3. System Architecture

### High-Level Flow

```
Agent (LangChain) → Governance API → Rules Engine
                                          ↓
                               Approve / Queue / Block
                                          ↓
                              [If Queued] → Approval Router
                                          ↓
                              Agent Owner reviews & decides
                                          ↓
                              Action executes → Outcome logged
```

### Components

**Governance API (Node.js + Express)**
The central entry point. Receives action requests from agents, runs them through the rules engine, and returns a decision. This is the only integration point agents need.

**Rules Engine**
Evaluates policies defined per agent role. Rules are stored in the database and evaluated at request time. A rule describes: what condition triggers it (action type, value threshold, agent role) and what the consequence is (auto-approve, require-approval, or block).

**Approval Router**
When an action requires human approval, this routes it to the agent's owner. In the MVP, routing is by agent owner — the person who registered the agent receives the approval request. It handles timeouts: if no decision is made within the configured window, the action is auto-cancelled and logged.

**Approval Queue**
A persistent queue of pending approvals. Owners can view, approve, or reject actions here via the dashboard or API. Rejections include a required reason field that becomes feedback data.

**Audit Logger**
Every action request, rule evaluation, approval decision, and outcome is written to an immutable log. Logs include: timestamp, agent ID, action type, proposed value, reasoning provided by the agent, rule matched, decision made, and who made it.

**Outcomes Tracker**
After an action executes, the platform tracks three things: success or failure (did the action complete without error), latency (time from action request to execution), and user acceptance rate (was the recommendation accepted or rejected by the human, across all approvals for that agent). These three metrics form the agent's performance profile.

**Dashboard (React)**
A lightweight frontend for agent owners. Shows: pending approvals, audit log, agent performance metrics, and role/rule configuration. Real-time updates via WebSockets.

---

## 4. Data Model

### `agents`
Represents a registered agent.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Human-readable label |
| `framework` | Enum | `langchain`, `crewai`, `custom` |
| `owner_id` | UUID | FK → users |
| `created_at` | Timestamp | |
| `active` | Boolean | Soft delete flag |

### `users`
Humans who own agents and/or approve actions.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | |
| `email` | String | Used for approval notifications |
| `role` | Enum | `admin`, `owner`, `viewer` |
| `created_at` | Timestamp | |

### `rules`
Governance policies. Each rule belongs to an agent.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK → agents |
| `action_type` | String | e.g. `price_change`, `stock_update` |
| `condition` | JSONB | e.g. `{ "threshold": 0.10, "operator": "gt" }` |
| `consequence` | Enum | `auto_approve`, `require_approval`, `block` |
| `created_at` | Timestamp | |

### `actions`
Every action request submitted by an agent.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK → agents |
| `action_type` | String | |
| `proposed_value` | JSONB | The agent's recommendation payload |
| `reasoning` | Text | Why the agent proposed this action |
| `rule_matched_id` | UUID | FK → rules (nullable) |
| `status` | Enum | `pending`, `approved`, `rejected`, `blocked`, `auto_approved`, `timed_out` |
| `created_at` | Timestamp | |
| `resolved_at` | Timestamp | Nullable |

### `approvals`
One-to-one with actions that required human sign-off.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `action_id` | UUID | FK → actions |
| `approver_id` | UUID | FK → users |
| `decision` | Enum | `approved`, `rejected` |
| `reason` | Text | Required on rejection |
| `decided_at` | Timestamp | |
| `timeout_at` | Timestamp | When this approval expires |

### `outcomes`
Tracks what happened after an action executed.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `action_id` | UUID | FK → actions |
| `success` | Boolean | Did the action complete without error |
| `latency_ms` | Integer | Time from action request to execution |
| `notes` | Text | Optional context on the outcome |
| `recorded_at` | Timestamp | |

---

## 5. API Specification

### Base URL
`/api/v1`

### Authentication
Bearer token in the Authorization header. In the MVP, a simple API key per agent and per user is sufficient. No OAuth required yet.

---

### Agent Actions

**Submit an action for governance review**
`POST /governance/request`

Request:
```json
{
  "agent_id": "uuid",
  "action_type": "price_change",
  "proposed_value": { "item": "tomatoes", "new_price": 550, "currency": "KES" },
  "reasoning": "Competitor prices have risen 12% this week based on market scan"
}
```

Response:
```json
{
  "action_id": "uuid",
  "decision": "pending_approval" | "auto_approved" | "blocked",
  "message": "Action queued for owner review",
  "timeout_at": "2026-04-12T16:00:00Z"
}
```

---

### Approvals

**List pending approvals for the authenticated owner**
`GET /approvals/pending`

Response:
```json
[
  {
    "action_id": "uuid",
    "agent_name": "Mama Mboga Sales Coach",
    "action_type": "price_change",
    "proposed_value": { ... },
    "reasoning": "...",
    "timeout_at": "2026-04-12T16:00:00Z"
  }
]
```

**Submit a decision on an approval**
`POST /approvals/decision`

Request:
```json
{
  "action_id": "uuid",
  "decision": "approved" | "rejected",
  "reason": "Price increase too aggressive for current market"
}
```

Response:
```json
{
  "action_id": "uuid",
  "decision": "rejected",
  "recorded_at": "2026-04-12T14:32:00Z"
}
```

---

### Outcomes

**Record what happened after an action executed**
`POST /outcomes/track`

Request:
```json
{
  "action_id": "uuid",
  "success": true,
  "latency_ms": 340,
  "notes": "Price updated in Google Sheet successfully"
}
```

---

### Audit Log

**Fetch audit log for an agent**
`GET /audit?agent_id=uuid&limit=50&offset=0`

Response:
```json
[
  {
    "action_id": "uuid",
    "action_type": "price_change",
    "status": "approved",
    "decided_by": "Kenn",
    "reasoning": "...",
    "created_at": "...",
    "resolved_at": "..."
  }
]
```

---

### Agent Performance

**Get performance metrics for an agent**
`GET /performance/:agent_id`

Response:
```json
{
  "agent_id": "uuid",
  "agent_name": "Mama Mboga Sales Coach",
  "total_actions": 142,
  "success_rate": 0.87,
  "avg_latency_ms": 412,
  "user_acceptance_rate": 0.74,
  "period": "last_30_days"
}
```

---

### Rules Management

**Create a governance rule for an agent**
`POST /rules`

Request:
```json
{
  "agent_id": "uuid",
  "action_type": "price_change",
  "condition": { "field": "change_percentage", "operator": "gt", "threshold": 0.10 },
  "consequence": "require_approval"
}
```

**List rules for an agent**
`GET /rules?agent_id=uuid`

---

## 6. LangChain Integration Pattern (MVP)

The agent integration should be as lightweight as possible. The agent calls the Governance API before executing any sensitive action. Here is the expected integration pattern at an architectural level:

1. Agent generates a recommendation or action
2. Agent calls `POST /governance/request` with the action details and its reasoning
3. If the response is `auto_approved`, the agent executes immediately
4. If the response is `pending_approval`, the agent waits or polls for a decision (polling interval configurable)
5. If the response is `blocked`, the agent logs the block and abandons the action
6. After execution, the agent (or the caller) posts the outcome to `POST /outcomes/track`

The integration point is a thin wrapper around the agent's execution step. The agent's internal logic does not change. Only its action-dispatch layer is aware of the governance API.

---

## 7. Performance Measurement (MVP Scope)

Track three metrics per agent:

**Success Rate**
Percentage of actions that completed without error, as reported by outcome tracking. Computed over a rolling 30-day window.

**Average Latency**
Mean time in milliseconds from action request submission to action execution. Tracks both governance overhead and downstream execution time.

**User Acceptance Rate**
Of all actions that required human approval, what percentage were approved versus rejected. A declining acceptance rate signals an agent whose recommendations are drifting from what the owner finds useful.

These three metrics are surfaced on the dashboard as a per-agent scorecard. No predictive scoring or Bayesian modelling in the MVP — raw metrics only.

---

## 8. Approval Routing Logic

In the MVP, routing is simple:

- Every action submitted by an agent is routed to that **agent's owner** (the `owner_id` on the agent record)
- Approval notification is sent to the owner's email
- Timeout window is configurable per agent (default: 2 hours)
- On timeout, the action status is set to `timed_out` and the action is not executed
- No escalation logic in the MVP

---

## 9. Tech Stack & Constraints

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js | Primary language |
| Framework | Express | Keep it simple |
| Database | PostgreSQL | Relational; JSONB for flexible payloads |
| Real-time | Socket.io | Push approval queue updates to dashboard |
| Frontend | React | Basic dashboard; no complex UI library required |
| Queue | Bull (Redis-backed) | For approval timeout management |
| Auth | API key (MVP) | Simple bearer token; no OAuth yet |

**Do not use:**
- External governance SaaS (we are building this ourselves)
- GraphQL (REST only for now)
- MongoDB or NoSQL primary store
- Microservices architecture (monolith for MVP)

---

## 10. MVP Scope Definition

### In Scope
- Agent registration and management
- Rule definition per agent (action type + condition + consequence)
- Action submission and rules evaluation
- Approval queue with owner routing
- Approval decision recording with reason
- Outcome tracking (success, latency, acceptance rate)
- Audit log per agent
- Performance scorecard per agent
- React dashboard: pending approvals, audit log, performance metrics, rule config
- LangChain as the first supported framework

### Out of Scope (Post-MVP)
- CrewAI or other framework integrations
- Predictive agent scoring or ML-based performance analysis
- Marketplace for shared agent roles
- Multi-approver workflows (m-of-n sign-off)
- Escalation on timeout
- Role-based routing beyond owner assignment
- OAuth or SSO authentication
- Enterprise compliance exports (SOC 2, GDPR reports)

---

## 11. Testing Strategy

**Unit tests** for the rules engine — given a rule and an action, does it produce the right consequence? Cover edge cases: exact threshold match, missing fields, unknown action types.

**Integration tests** for the approval flow — submit an action → receive pending status → POST a decision → verify action status updated → POST outcome → verify metrics updated.

**Scenario tests** using a mock LangChain agent that submits actions through the full governance flow. This is the primary end-to-end test.

**No load testing in MVP** — optimize for correctness first.

---

## 12. Reference Use Case: Mama Mboga

Use this as the grounding scenario when making implementation decisions.

Mama Mboga is a WhatsApp coaching system for market vendors. It has LangChain agents that advise vendors on:
- Pricing (when to raise or lower prices based on market data)
- Stock management (what to reorder, when, and how much)
- Sales coaching (how to handle slow days, negotiate with suppliers)

For this use case, the governance platform does the following:
- A **price_change** action above 10% triggers a require_approval rule
- The agent owner (the Mama Mboga operator or coach) receives the approval
- They see what the agent recommended and why, approve or reject
- If approved, the WhatsApp message goes out to the vendor
- The outcome is tracked: did the vendor follow through? (manual input in MVP)
- Over time, the operator sees which agent recommendations they keep approving vs rejecting

This use case is concrete and testable. Use it to validate that the API design makes sense in practice.

---

## 13. Glossary

| Term | Definition |
|---|---|
| **Agent** | An AI system (e.g. LangChain chain) that takes autonomous actions |
| **Action** | A specific thing an agent proposes to do (e.g. send a message, change a price) |
| **Rule** | A policy that defines what happens when an agent proposes a certain type of action |
| **Governance** | The process of evaluating an action against rules before it executes |
| **Approval** | Human sign-off required before an action executes |
| **Outcome** | What actually happened after an action was executed |
| **Agent Owner** | The human responsible for a given agent; receives approvals for that agent |
| **User Acceptance Rate** | Percentage of approval-required actions that the owner approved |
| **Audit Log** | Immutable record of every action, decision, and outcome |
| **Mama Mboga** | The reference use case — a WhatsApp coaching agent for informal market vendors |

---

*End of briefing. Antigravity should begin with the data model, then the rules engine, then the approval flow, then the API endpoints, then the dashboard. Build in that order.*
