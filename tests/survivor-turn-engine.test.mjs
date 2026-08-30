import test from "node:test";
import assert from "node:assert/strict";
import {createInitialGameState} from "../module/state/game-state-model.mjs";
import {createActionState} from "../module/engine/survivor/action-economy.mjs";
import {
  assignSurvivor,
  configureRoster,
  endActivation,
  getSurvivorTurnProgress,
  setFirstPlayer,
  startActivation
} from "../module/engine/survivor/turn-engine.mjs";

const actionState = () => createActionState({system: {actions: {baseOverride: null}}, items: []});

test("configures explicit player order and unique Survivor assignments", () => {
  const state = configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {
      "User.a": ["Actor.s1", "Actor.s2"],
      "User.b": ["Actor.s3"]
    },
    firstPlayerUserUuid: "User.b"
  });
  assert.equal(state.firstPlayerUserUuid, "User.b");
  assert.equal(state.activePlayerUserUuid, "User.b");
  assert.equal(state.flags.gameStarted, true);
  assert.throws(() => configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {"User.a": ["Actor.s1"], "User.b": ["Actor.s1"]}
  }), error => error.code === "SURVIVOR_ASSIGNED_TWICE");
});

test("allows each assigned Survivor once before passing play", () => {
  let state = configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {
      "User.a": ["Actor.s1", "Actor.s2"],
      "User.b": ["Actor.s3"]
    }
  });
  state = startActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1", actionState: actionState()});
  state = endActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1"});
  assert.equal(state.activePlayerUserUuid, "User.a");
  assert.throws(
    () => startActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1", actionState: actionState()}),
    error => error.code === "SURVIVOR_ALREADY_ACTIVATED"
  );
  state = startActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s2", actionState: actionState()});
  state = endActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s2"});
  assert.equal(state.activePlayerUserUuid, "User.b");
  assert.deepEqual(state.completedPlayerUserUuids, ["User.a"]);
  state = startActivation(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s3", actionState: actionState()});
  state = endActivation(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s3"});
  assert.equal(state.phase, "zombie");
  assert.equal(state.activePlayerUserUuid, null);
  assert.deepEqual(getSurvivorTurnProgress(state), {
    players: [
      {
        playerUserUuid: "User.a",
        assignedSurvivorUuids: ["Actor.s1", "Actor.s2"],
        pendingSurvivorUuids: [],
        complete: true
      },
      {
        playerUserUuid: "User.b",
        assignedSurvivorUuids: ["Actor.s3"],
        pendingSurvivorUuids: [],
        complete: true
      }
    ],
    assignedSurvivorUuids: ["Actor.s1", "Actor.s2", "Actor.s3"],
    pendingSurvivorUuids: [],
    activatedCount: 3,
    totalCount: 3,
    complete: true
  });
});

test("skips stale empty player entries when the final assigned Survivor ends", () => {
  let state = configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {"User.a": ["Actor.s1"], "User.b": ["Actor.s2"]}
  });
  state.playerOrder.push("User.stale");
  state.survivorsByPlayer["User.stale"] = [];
  state = startActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1", actionState: actionState()});
  state = endActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1"});
  state = startActivation(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s2", actionState: actionState()});
  state = endActivation(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s2"});
  assert.equal(state.phase, "zombie");
  assert.equal(state.activePlayerUserUuid, null);
});

test("rejects control by a non-active or unassigned player", () => {
  const state = configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {"User.a": ["Actor.s1"], "User.b": ["Actor.s2"]}
  });
  assert.throws(
    () => startActivation(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s2", actionState: actionState()}),
    error => error.code === "NOT_ACTIVE_PLAYER"
  );
  assert.throws(
    () => startActivation(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s2", actionState: actionState()}),
    error => error.code === "SURVIVOR_NOT_ASSIGNED"
  );
});

test("supports explicit GM-style assignment and First Player changes between activations", () => {
  let state = createInitialGameState();
  state = assignSurvivor(state, {playerUserUuid: "User.a", survivorUuid: "Actor.s1"});
  state = assignSurvivor(state, {playerUserUuid: "User.b", survivorUuid: "Actor.s2"});
  state = setFirstPlayer(state, "User.b");
  assert.deepEqual(state.playerOrder, ["User.a", "User.b"]);
  assert.equal(state.activePlayerUserUuid, "User.b");
});
