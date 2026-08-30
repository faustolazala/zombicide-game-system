import test from "node:test";
import assert from "node:assert/strict";
import {
  canAffordAction,
  createActionState,
  getActionsRemaining,
  getBaseActions,
  getBonusActions,
  refundActions,
  spendActions,
  SURVIVOR_ACTIONS
} from "../module/engine/survivor/action-economy.mjs";

const survivor = {
  system: {actions: {baseOverride: null}},
  items: [{
    type: "skill",
    system: {effects: [
      {type: "bonusAction", actionType: "move", value: 1},
      {type: "bonusAction", actionType: "any", value: 1}
    ]}
  }]
};

test("derives base and restricted bonus actions", () => {
  assert.equal(getBaseActions(survivor), 3);
  assert.deepEqual(getBonusActions(survivor), {general: 1, restricted: {move: 1}});
  const state = createActionState(survivor);
  assert.equal(state.general.available, 4);
  assert.equal(state.restricted.move.available, 1);
});

test("spends matching restricted actions before general actions", () => {
  const ready = createActionState(survivor);
  ready.status = "active";
  const afterFirst = spendActions(ready, {
    transactionId: "spend-1",
    actionId: "move",
    actionType: "move",
    cost: 1
  });
  assert.equal(afterFirst.restricted.move.spent, 1);
  assert.equal(afterFirst.general.spent, 0);
  const afterSecond = spendActions(afterFirst, {
    transactionId: "spend-2",
    actionId: "move",
    actionType: "move",
    cost: 1
  });
  assert.equal(afterSecond.general.spent, 1);
  assert.equal(getActionsRemaining(afterSecond, "move").total, 3);
  assert.equal(canAffordAction(afterSecond, SURVIVOR_ACTIONS.move), true);
});

test("rejects overspending and duplicate spend IDs without mutating input", () => {
  const state = createActionState({system: {actions: {baseOverride: 1}}, items: []});
  state.status = "active";
  const spent = spendActions(state, {
    transactionId: "spend-1",
    actionId: "search",
    actionType: "search",
    cost: 1
  });
  assert.throws(() => spendActions(spent, {
    transactionId: "spend-2",
    actionId: "search",
    actionType: "search",
    cost: 1
  }), error => error.code === "INSUFFICIENT_ACTIONS");
  assert.throws(() => spendActions(spent, {
    transactionId: "spend-1",
    actionId: "search",
    actionType: "search",
    cost: 1
  }), error => error.code === "DUPLICATE_ACTION_SPEND");
  assert.equal(state.general.spent, 0);
});

test("refunds only by an explicit compensating transaction", () => {
  const state = createActionState({system: {actions: {baseOverride: 1}}, items: []});
  state.status = "active";
  const spent = spendActions(state, {
    transactionId: "spend-1",
    actionId: "special",
    actionType: "special",
    cost: 1
  });
  const refunded = refundActions(spent, {
    transactionId: "refund-1",
    originalTransactionId: "spend-1"
  });
  assert.equal(refunded.general.spent, 0);
  assert.throws(() => refundActions(refunded, {
    transactionId: "refund-2",
    originalTransactionId: "spend-1"
  }), error => error.code === "ACTION_ALREADY_REFUNDED");
});
