import { knex } from 'knex';

const dbPath = process.env.DB_PATH || './governance.sqlite';

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true
});

export const initDb = async () => {
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', table => {
      table.string('id').primary(); // uuid
      table.string('name');
      table.string('email').unique();
      table.string('role');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasAgents = await db.schema.hasTable('agents');
  if (!hasAgents) {
    await db.schema.createTable('agents', table => {
      table.string('id').primary();
      table.string('name');
      table.string('framework');
      table.string('owner_id').references('id').inTable('users');
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasApiKeys = await db.schema.hasTable('api_keys');
  if (!hasApiKeys) {
    await db.schema.createTable('api_keys', table => {
      table.string('id').primary();
      table.string('owner_id').nullable().references('id').inTable('users');
      table.string('agent_id').nullable().references('id').inTable('agents');
      table.string('key_hash');
      table.string('key_hint');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasRules = await db.schema.hasTable('rules');
  if (!hasRules) {
    await db.schema.createTable('rules', table => {
      table.string('id').primary();
      table.string('agent_id').references('id').inTable('agents');
      table.string('action_type');
      table.json('condition');
      table.string('consequence');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasActions = await db.schema.hasTable('actions');
  if (!hasActions) {
    await db.schema.createTable('actions', table => {
      table.string('id').primary();
      table.string('agent_id').references('id').inTable('agents');
      table.string('action_type');
      table.json('proposed_value');
      table.text('reasoning');
      table.string('rule_matched_id').nullable().references('id').inTable('rules');
      table.string('status');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('resolved_at').nullable();
      table.timestamp('timeout_at').nullable();
    });
  }

  const hasApprovals = await db.schema.hasTable('approvals');
  if (!hasApprovals) {
    await db.schema.createTable('approvals', table => {
      table.string('id').primary();
      table.string('action_id').references('id').inTable('actions');
      table.string('approver_id').references('id').inTable('users');
      table.string('decision');
      table.text('reason').nullable();
      table.timestamp('decided_at').defaultTo(db.fn.now());
    });
  }

  const hasOutcomes = await db.schema.hasTable('outcomes');
  if (!hasOutcomes) {
    await db.schema.createTable('outcomes', table => {
      table.string('id').primary();
      table.string('action_id').references('id').inTable('actions');
      table.boolean('success');
      table.integer('latency_ms');
      table.text('notes').nullable();
      table.timestamp('recorded_at').defaultTo(db.fn.now());
    });
  }
};
