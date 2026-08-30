import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanGameState,
  createInitialGameState,
  GameStateModel,
  GameStateValidationError,
  migrateGameState,
  serializeGameStateForStorage
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

test("repairs Document UUID keys expanded by Foundry persistence", () => {
  const source = createInitialGameState();
  source.survivorsByPlayer = {User: {player1: ["Actor.survivor1"]}};
  source.actionStateBySurvivorUuid = {
    Actor: {
      survivor1: {
        status: "active",
        general: {available: 3, spent: 1},
        restricted: {},
        ledger: []
      }
    }
  };

  const state = GameStateModel.from(source).toObject();
  assert.deepEqual(state.survivorsByPlayer, {"User.player1": ["Actor.survivor1"]});
  assert.equal(state.actionStateBySurvivorUuid["Actor.survivor1"].general.spent, 1);
});

test("encodes Document UUID map keys for Foundry-safe storage and round trips them", () => {
  const source = createInitialGameState();
  source.survivorsByPlayer = {"User.player1": ["Actor.survivor1"]};
  source.actionStateBySurvivorUuid = {
    "Actor.survivor1": {
      status: "ready",
      general: {available: 3, spent: 0},
      restricted: {},
      ledger: []
    }
  };

  const stored = serializeGameStateForStorage(source);
  assert.deepEqual(Object.keys(stored.survivorsByPlayer), ["zmk_User%2Eplayer1"]);
  assert.deepEqual(Object.keys(stored.actionStateBySurvivorUuid), ["zmk_Actor%2Esurvivor1"]);
  assert.deepEqual(GameStateModel.from(stored).toObject(), source);
});
