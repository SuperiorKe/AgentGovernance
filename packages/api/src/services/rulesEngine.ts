import { db } from '../db';

export function evaluateCondition(condition: any, payload: any): boolean {
  if (!condition) return false;

  if (condition.AND && Array.isArray(condition.AND)) {
    return condition.AND.every((cond: any) => evaluateCondition(cond, payload));
  }

  if (condition.OR && Array.isArray(condition.OR)) {
    return condition.OR.some((cond: any) => evaluateCondition(cond, payload));
  }

  const { field, operator, threshold } = condition;
  if (!field || !operator) return false;

  const value = payload[field];
  if (value === undefined) return false;

  switch (operator) {
    case 'eq': return value === threshold;
    case 'neq': return value !== threshold;
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'contains': return typeof value === 'string' && value.includes(threshold);
    default: return false;
  }
}

export async function evaluateActionRules(agentId: string, actionType: string, proposedValue: any) {
  const rules = await db('rules')
    .where({ agent_id: agentId, action_type: actionType });

  if (!rules || rules.length === 0) {
    // Zero-trust fallback
    return { consequence: 'require_approval', ruleMatchedId: null };
  }

  let finalConsequence = 'auto_approve';
  let matchedRuleId = null;

  // 'block' > 'require_approval' > 'auto_approve'
  const consequenceSeverity: Record<string, number> = {
    'auto_approve': 1,
    'require_approval': 2,
    'block': 3
  };

  for (const rule of rules) {
    let conditionObj;
    try {
      conditionObj = typeof rule.condition === 'string' ? JSON.parse(rule.condition) : rule.condition;
    } catch (e) {
      continue;
    }

    const isMatch = evaluateCondition(conditionObj, proposedValue);
    if (isMatch) {
      const currentSeverity = consequenceSeverity[finalConsequence] || 1;
      const ruleSeverity = consequenceSeverity[rule.consequence] || 1;

      if (ruleSeverity > currentSeverity || !matchedRuleId) {
        finalConsequence = rule.consequence;
        matchedRuleId = rule.id;
      }
    }
  }

  if (!matchedRuleId) {
    return { consequence: 'require_approval', ruleMatchedId: null };
  }

  return { consequence: finalConsequence, ruleMatchedId: matchedRuleId };
}
