import {assertRule} from "../rule-error.mjs";

const defineAction = (id, actionType = id) => Object.freeze({
  id,
  label: `ZOMBICIDE.Actions.${id}`,
  actionType,
  validate: () => true,
  getCost: () => 1
});

export const SURVIVOR_ACTIONS = Object.freeze({
  move: defineAction("move"),
  search: defineAction("search"),
  door: defineAction("door"),
  reorganize: defineAction("reorganize"),
  melee: defineAction("melee"),
  ranged: defineAction("ranged"),
  objective: defineAction("objective"),
  special: defineAction("special")
});

const clone = value => structuredClone(value);

export function getBaseActions(survivor) {
  const override = survivor?.system?.actions?.baseOverride;
  return Number.isInteger(override) && override >= 0 ? override : 3;
}

export function getBonusActions(survivor, _context = {}) {
  const result = {general: 0, restricted: {}};
  for (const item of survivor?.items ?? []) {
    if (item.type !== "skill") continue;
    for (const effect of item.system?.effects ?? []) {
      if (effect?.type !== "bonusAction") continue;
      const value = Number.isInteger(effect.value) && effect.value > 0 ? effect.value : 0;
      if (!value) continue;
      const actionType = typeof effect.actionType === "string" ? effect.actionType : "any";
      if (actionType === "any") result.general += value;
      else result.restricted[actionType] = (result.restricted[actionType] ?? 0) + value;
    }
  }
  return result;
}

export function createActionState(survivor) {
  const bonuses = getBonusActions(survivor);
  return {
    status: "ready",
    general: {
      available: getBaseActions(survivor) + bonuses.general,
      spent: 0
    },
    restricted: Object.fromEntries(
      Object.entries(bonuses.restricted).map(([type, available]) => [type, {available, spent: 0}])
    ),
    ledger: []
  };
}

export function getActionCost(action, survivor = null, context = {}) {
  const definition = typeof action === "string" ? SURVIVOR_ACTIONS[action] : action;
  assertRule(definition, "UNKNOWN_ACTION", `Unknown Survivor action '${action}'.`);
  const cost = typeof definition.getCost === "function"
    ? definition.getCost({survivor, context})
    : definition.cost;
  assertRule(Number.isInteger(cost) && cost >= 0, "INVALID_ACTION_COST", "Action cost must be a non-negative integer.");
  return cost;
}

export function getActionsRemaining(actionState, actionType = null) {
  const general = Math.max(0, actionState.general.available - actionState.general.spent);
  const restrictedPool = actionType ? actionState.restricted[actionType] : null;
  const restricted = restrictedPool
    ? Math.max(0, restrictedPool.available - restrictedPool.spent)
    : 0;
  return {general, restricted, total: general + restricted};
}

export function canAffordAction(actionState, action, survivor = null, context = {}) {
  const definition = typeof action === "string" ? SURVIVOR_ACTIONS[action] : action;
  const cost = getActionCost(definition, survivor, context);
  return getActionsRemaining(actionState, definition.actionType).total >= cost;
}

export function spendActions(actionState, {transactionId, actionId, actionType, cost}) {
  const next = clone(actionState);
  assertRule(next.status === "active", "SURVIVOR_NOT_ACTIVE", "Actions may only be spent by the active Survivor.");
  assertRule(typeof transactionId === "string" && transactionId.length > 0, "INVALID_TRANSACTION_ID", "Action spending requires a transaction ID.");
  assertRule(!next.ledger.some(entry => entry.transactionId === transactionId), "DUPLICATE_ACTION_SPEND", "This transaction already spent actions.");
  assertRule(Number.isInteger(cost) && cost >= 0, "INVALID_ACTION_COST", "Action cost must be a non-negative integer.");

  const remaining = getActionsRemaining(next, actionType);
  assertRule(remaining.total >= cost, "INSUFFICIENT_ACTIONS", `The Survivor needs ${cost} action(s) but has ${remaining.total}.`);

  const restrictedPool = next.restricted[actionType];
  const restrictedRemaining = restrictedPool
    ? Math.max(0, restrictedPool.available - restrictedPool.spent)
    : 0;
  const restrictedSpent = Math.min(cost, restrictedRemaining);
  const generalSpent = cost - restrictedSpent;
  if (restrictedPool) restrictedPool.spent += restrictedSpent;
  next.general.spent += generalSpent;
  next.ledger.push({
    transactionId,
    actionId,
    actionType,
    cost,
    restrictedSpent,
    generalSpent,
    refundedByTransactionId: null
  });
  return next;
}

export function refundActions(actionState, {transactionId, originalTransactionId}) {
  const next = clone(actionState);
  assertRule(typeof transactionId === "string" && transactionId.length > 0, "INVALID_TRANSACTION_ID", "A refund requires a transaction ID.");
  assertRule(!next.ledger.some(entry => entry.transactionId === transactionId), "DUPLICATE_REFUND", "This refund transaction was already used.");
  const original = next.ledger.find(entry => entry.transactionId === originalTransactionId);
  assertRule(original, "UNKNOWN_ACTION_SPEND", "The original action-spend transaction was not found.");
  assertRule(!original.refundedByTransactionId, "ACTION_ALREADY_REFUNDED", "The original action spend was already refunded.");

  next.general.spent = Math.max(0, next.general.spent - original.generalSpent);
  const restrictedPool = next.restricted[original.actionType];
  if (restrictedPool) restrictedPool.spent = Math.max(0, restrictedPool.spent - original.restrictedSpent);
  original.refundedByTransactionId = transactionId;
  next.ledger.push({
    transactionId,
    actionId: "refund",
    actionType: original.actionType,
    cost: 0,
    restrictedSpent: 0,
    generalSpent: 0,
    refundsTransactionId: originalTransactionId,
    refundedByTransactionId: null
  });
  return next;
}
