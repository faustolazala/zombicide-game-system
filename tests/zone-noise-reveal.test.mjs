import test from "node:test";
import assert from "node:assert/strict";
import {revealBuildingOnDoorOpen} from "../module/engine/zone/building-reveal.mjs";
import {addNoise, clearNoise, getNoisiestZones, removeNoise} from "../module/engine/zone/noise.mjs";
import {buildZoneGraph} from "../module/engine/zone/zone-model.mjs";

test("tracks, sorts, removes, and clears transient zone noise", () => {
  let noise = {};
  noise = addNoise(noise, "zone-b", 2, "door").noise;
  noise = addNoise(noise, "zone-a", 3, "attack").noise;
  assert.deepEqual(getNoisiestZones(noise), [{zoneId: "zone-a", amount: 3}, {zoneId: "zone-b", amount: 2}]);
  noise = removeNoise(noise, "zone-a", 1).noise;
  assert.equal(noise["zone-a"], 2);
  assert.equal(clearNoise(noise).cleared, 4);
});

test("reveals a building only on its first qualifying door opening", () => {
  const graph = buildZoneGraph({
    zones: [
      {zoneId: "street", regionUuid: "Region.street", type: "street", streetAxis: "horizontal"},
      {zoneId: "room", regionUuid: "Region.room", type: "room", buildingId: "building-a"}
    ],
    edges: [{id: "door-edge", from: "street", to: "room", type: "door", doorUuid: "Wall.door"}],
    doorStates: {"Wall.door": {open: true}}
  });
  const first = revealBuildingOnDoorOpen({}, graph, "door-edge");
  assert.equal(first.revealed, true);
  assert.equal(first.buildingState["building-a"].triggeringDoorEdgeId, "door-edge");
  const second = revealBuildingOnDoorOpen(first.buildingState, graph, "door-edge");
  assert.equal(second.revealed, false);
});
