import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  CommandValidationError,
  noOperationHandler
} from "../module/commands/command-service.mjs";
import {createInitialGameState, MAX_RECENT_TRANSACTION_IDS} from "../module/state/game-state-model.mjs";

const command = (overrides = {}) => ({
  transactionId: "tx-1",
  expectedRevision: 0,
  type: "system.noop",
  ...overrides
});

test("accepts a command and increments the revision once", async () => {
  const source = createInitialGameState();
  const result = await applyCommand(source, command(), noOperationHandler);
  assert.equal(result.previousRevision, 0);
  assert.equal(result.revision, 1);
  assert.equal(result.state.lastTransactionId, "tx-1");
  assert.deepEqual(result.state.recentTransactionIds, ["tx-1"]);
  assert.equal(source.revision, 0, "the source state was not mutated");
});

test("rejects a stale revision", async () => {
  const state = {...createInitialGameState(), revision: 3};
  await assert.rejects(
    applyCommand(state, command({expectedRevision: 2}), noOperationHandler),
    error => error instanceof CommandValidationError && error.code === "STALE_REVISION"
  );
});

test("rejects duplicate transaction IDs", async () => {
  const first = await applyCommand(createInitialGameState(), command(), noOperationHandler);
  await assert.rejects(
    applyCommand(first.state, command({expectedRevision: 1}), noOperationHandler),
    error => error instanceof CommandValidationError && error.code === "DUPLICATE_TRANSACTION"
  );
});

test("keeps a bounded idempotency history", async () => {
  const recentTransactionIds = Array.from({length: MAX_RECENT_TRANSACTION_IDS}, (_, index) => `old-${index}`);
  const state = {...createInitialGameState(), recentTransactionIds};
  const result = await applyCommand(state, command({transactionId: "new"}), noOperationHandler);
  assert.equal(result.state.recentTransactionIds.length, MAX_RECENT_TRANSACTION_IDS);
  assert.equal(result.state.recentTransactionIds.at(-1), "new");
  assert.equal(result.state.recentTransactionIds.includes("old-0"), false);
});

test("uses the handler's calculated state and events", async () => {
  const result = await applyCommand(createInitialGameState(), command(), state => {
    state.round = 2;
    return {state, events: [{type: "roundChanged"}]};
  });
  assert.equal(result.state.round, 2);
  assert.deepEqual(result.events, [{type: "roundChanged"}]);
});
