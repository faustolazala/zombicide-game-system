import test from "node:test";
import assert from "node:assert/strict";
import {createInitialGameState} from "../module/state/game-state-model.mjs";
import {ZONE_COMMAND_HANDLERS, ZONE_COMMANDS, validateSceneBoard} from "../module/foundry/zone-commands.mjs";

const gm = {id: "gm", uuid: "User.gm", active: true, isGM: true};

function installGlobals() {
  globalThis.game = {
    users: {get: id => id === gm.id ? gm : null}
  };
}

function sceneWithZones() {
  const regionA = {
    id: "region-a",
    uuid: "Scene.scene.Region.region-a",
    name: "Street A",
    _stats: {modifiedTime: 1},
    behaviors: [{
      id: "behavior-a",
      uuid: "Scene.scene.Region.region-a.RegionBehavior.behavior-a",
      type: "zombicideZone",
      system: {
        enabled: true,
        zoneId: "street-a",
        type: "street",
        buildingId: null,
        streetAxis: "horizontal",
        membershipPriority: 0,
        searchable: false,
        spawnZone: false,
        objectiveZone: false,
        exitZone: false
      },
      _stats: {modifiedTime: 1}
    }]
  };
  const regionB = {
    id: "region-b",
    uuid: "Scene.scene.Region.region-b",
    name: "Street B",
    _stats: {modifiedTime: 1},
    behaviors: [{
      id: "behavior-b",
      uuid: "Scene.scene.Region.region-b.RegionBehavior.behavior-b",
      type: "zombicideZone",
      system: {
        enabled: true,
        zoneId: "street-b",
        type: "street",
        buildingId: null,
        streetAxis: "horizontal",
        membershipPriority: 0,
        searchable: false,
        spawnZone: false,
        objectiveZone: false,
        exitZone: false
      },
      _stats: {modifiedTime: 1}
    }]
  };
  return {uuid: "Scene.scene", regions: [regionA, regionB], walls: []};
}

test("configures a validated explicit Zone graph through the authority handler", async () => {
  installGlobals();
  const scene = sceneWithZones();
  const state = createInitialGameState();
  const result = await ZONE_COMMAND_HANDLERS[ZONE_COMMANDS.CONFIGURE_GRAPH](
    state,
    {
      payload: {
        edges: [{id: "edge-ab", from: "street-a", to: "street-b", type: "open"}],
        sightLanes: {lane: {axis: "horizontal", zoneIds: ["street-a", "street-b"]}},
        visibilityOverrides: []
      }
    },
    {requesterUserId: "gm", scene}
  );
  assert.deepEqual(result.state.zoneGraph.edges, [{id: "edge-ab", from: "street-a", to: "street-b", type: "open"}]);
  assert.equal(validateSceneBoard(scene, result.state).valid, true);
});

test("rejects invalid graph references and records transient noise", async () => {
  installGlobals();
  const scene = sceneWithZones();
  await assert.rejects(
    ZONE_COMMAND_HANDLERS[ZONE_COMMANDS.CONFIGURE_GRAPH](
      createInitialGameState(),
      {payload: {edges: [{id: "broken", from: "street-a", to: "missing", type: "open"}]}},
      {requesterUserId: "gm", scene}
    ),
    error => error.code === "INVALID_ZONE_GRAPH"
  );
  const added = await ZONE_COMMAND_HANDLERS[ZONE_COMMANDS.ADD_NOISE](
    createInitialGameState(),
    {payload: {zoneId: "street-a", amount: 2, source: "door"}},
    {requesterUserId: "gm", scene}
  );
  assert.equal(added.state.noise["street-a"], 2);
  const cleared = await ZONE_COMMAND_HANDLERS[ZONE_COMMANDS.CLEAR_NOISE](
    added.state,
    {payload: {}},
    {requesterUserId: "gm", scene}
  );
  assert.deepEqual(cleared.state.noise, {});
});

test("creates a typed RegionBehavior change without leaking adapter-only regionUuid", async () => {
  installGlobals();
  const scene = sceneWithZones();
  const newRegion = {
    id: "region-new",
    uuid: "Scene.scene.Region.region-new",
    name: "Room",
    _stats: {modifiedTime: 1},
    behaviors: []
  };
  scene.regions.push(newRegion);
  const result = await ZONE_COMMAND_HANDLERS[ZONE_COMMANDS.SET_BEHAVIOR](
    createInitialGameState(),
    {payload: {regionUuid: newRegion.uuid, system: {zoneId: "room", type: "room", buildingId: "building-a"}}},
    {requesterUserId: "gm", scene}
  );
  assert.equal(result.changes[0].operation, "createEmbeddedDocuments");
  assert.equal(result.changes[0].data[0].system.regionUuid, undefined);
  assert.equal(result.changes[0].data[0].system.zoneId, "room");
});
