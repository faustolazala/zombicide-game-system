import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanGameState,
  createInitialGameState,
  GameStateModel,
  GameStateValidationError,
  migrateGameState
} from "../module/state/game-state-model.mjs";

test("creates the versioned canonical Scene state", () => {
  const state = GameStateModel.create({missionId: "scene-1", gameStarted: true}).toObject();
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.revision, 0);
  assert.equal(state.round, 1);
  assert.equal(state.phase, "survivor");
  assert.equal(state.missionId, "scene-1");
  assert.equal(state.flags.gameStarted, true);
});

test("migrates an unversioned state to schema version 1", () => {
  const migrated = migrateGameState({missionId: "legacy", flags: {gameStarted: true}});
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.missionId, "legacy");
  assert.equal(migrated.flags.gameStarted, true);
});

test("cleans unknown keys and clones mutable records", () => {
  const source = createInitialGameState();
  source.unknown = "discard me";
  source.noise = {zoneA: 2};
  const cleaned = cleanGameState(source);
  source.noise.zoneA = 99;
  assert.equal(cleaned.unknown, undefined);
  assert.equal(cleaned.noise.zoneA, 2);
});

test("rejects future state versions", () => {
  assert.throws(
    () => GameStateModel.from({schemaVersion: 99}),
    GameStateValidationError
  );
});

test("serialization does not expose mutable model state", () => {
  const model = GameStateModel.create();
  const first = model.toObject();
  first.round = 8;
  assert.equal(model.toObject().round, 1);
});

test("coerces malformed mapping fields to safe records", () => {
  const source = createInitialGameState();
  source.noise = [];
  source.objectiveState = "invalid";
  const state = GameStateModel.from(source).toObject();
  assert.deepEqual(state.noise, {});
  assert.deepEqual(state.objectiveState, {});
});
