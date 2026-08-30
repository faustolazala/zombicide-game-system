import test from "node:test";
import assert from "node:assert/strict";
import {createInitialGameState} from "../module/state/game-state-model.mjs";
import {configureRoster} from "../module/engine/survivor/turn-engine.mjs";
import {
  SURVIVOR_COMMAND_HANDLERS,
  SURVIVOR_COMMANDS
} from "../module/foundry/survivor-commands.mjs";

function itemCollection(items = []) {
  return {
    get: id => items.find(item => item.id === id),
    map: callback => items.map(callback),
    [Symbol.iterator]: () => items.values()
  };
}

function survivor(uuid) {
  const systemSource = {
    identity: {isKid: false},
    wounds: {value: 0, maximumOverride: null},
    adrenaline: {value: 0},
    actions: {baseOverride: null},
    inventory: {
      leftHandItemId: null,
      rightHandItemId: null,
      bodyItemId: null,
      backpackItemIds: [],
      backpackCapacity: 5
    }
  };
  return {
    uuid,
    documentName: "Actor",
    type: "survivor",
    isEliminated: false,
    _stats: {modifiedTime: 1},
    system: {
      ...systemSource,
      toObject: () => structuredClone(systemSource)
    },
    items: itemCollection(),
    toObject: () => ({system: structuredClone(systemSource)})
  };
}

const users = [
  {id: "player-a", uuid: "User.a", name: "A", active: true, isGM: false},
  {id: "player-b", uuid: "User.b", name: "B", active: true, isGM: false},
  {id: "gm", uuid: "User.gm", name: "GM", active: true, isGM: true}
];
const actors = new Map([
  ["Actor.s1", survivor("Actor.s1")],
  ["Actor.s2", survivor("Actor.s2")]
]);

function installGlobals() {
  globalThis.game = {
    users: {
      get: id => users.find(user => user.id === id),
      find: callback => users.find(callback),
      [Symbol.iterator]: () => users.values()
    }
  };
  globalThis.fromUuid = async uuid => actors.get(uuid) ?? null;
  globalThis.foundry ??= {utils: {}};
  globalThis.foundry.utils.randomID ??= () => "generated-id";
}

function rosterState() {
  return configureRoster(createInitialGameState(), {
    playerOrder: ["User.a", "User.b"],
    survivorsByPlayer: {"User.a": ["Actor.s1"], "User.b": ["Actor.s2"]}
  });
}

test("authority handlers reject a non-active player", async () => {
  installGlobals();
  await assert.rejects(
    SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.START_ACTIVATION](
      rosterState(),
      {transactionId: "tx", payload: {survivorUuid: "Actor.s2"}},
      {requesterUserId: "player-b"}
    ),
    error => error.code === "NOT_ACTIVE_PLAYER"
  );
});

test("authority handlers allow only the assigned active player to spend", async () => {
  installGlobals();
  const started = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.START_ACTIVATION](
    rosterState(),
    {transactionId: "start", payload: {survivorUuid: "Actor.s1"}},
    {requesterUserId: "player-a"}
  );
  await assert.rejects(
    SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.SPEND_ACTION](
      structuredClone(started.state),
      {transactionId: "spend-b", payload: {survivorUuid: "Actor.s1", actionId: "move"}},
      {requesterUserId: "player-b"}
    ),
    error => error.code === "SURVIVOR_NOT_CONTROLLED"
  );
  const spent = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.SPEND_ACTION](
    structuredClone(started.state),
    {transactionId: "spend-a", payload: {survivorUuid: "Actor.s1", actionId: "move"}},
    {requesterUserId: "player-a"}
  );
  assert.equal(spent.state.actionStateBySurvivorUuid["Actor.s1"].general.spent, 1);
});

test("roster configuration is GM-only", async () => {
  installGlobals();
  const command = {
    transactionId: "setup",
    payload: {
      playerOrder: ["User.a"],
      survivorsByPlayer: {"User.a": ["Actor.s1"]},
      firstPlayerUserUuid: "User.a"
    }
  };
  await assert.rejects(
    SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.CONFIGURE_ROSTER](
      createInitialGameState(), command, {requesterUserId: "player-a"}
    ),
    error => error.code === "GM_ONLY"
  );
  const configured = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.CONFIGURE_ROSTER](
    createInitialGameState(), command, {requesterUserId: "gm"}
  );
  assert.equal(configured.state.activePlayerUserUuid, "User.a");
});

test("final authority activation announces the Zombie Phase transition", async () => {
  installGlobals();
  let state = rosterState();
  let result = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.START_ACTIVATION](
    state,
    {transactionId: "start-a", payload: {survivorUuid: "Actor.s1"}},
    {requesterUserId: "player-a"}
  );
  result = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.END_ACTIVATION](
    result.state,
    {transactionId: "end-a", payload: {survivorUuid: "Actor.s1"}},
    {requesterUserId: "player-a"}
  );
  result = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.START_ACTIVATION](
    result.state,
    {transactionId: "start-b", payload: {survivorUuid: "Actor.s2"}},
    {requesterUserId: "player-b"}
  );
  result = await SURVIVOR_COMMAND_HANDLERS[SURVIVOR_COMMANDS.END_ACTIVATION](
    result.state,
    {transactionId: "end-b", payload: {survivorUuid: "Actor.s2"}},
    {requesterUserId: "player-b"}
  );
  assert.equal(result.state.phase, "zombie");
  assert.deepEqual(result.events.map(event => event.type), [
    "survivorActivationEnded",
    "survivorPhaseEnded"
  ]);
});
