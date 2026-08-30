import test from "node:test";
import assert from "node:assert/strict";
import {
  buildZoneGraph,
  findZonePath,
  getAdjacentZones,
  validateZoneGraph
} from "../module/engine/zone/zone-model.mjs";

const zones = [
  {zoneId: "street-a", regionUuid: "Region.a", type: "street", streetAxis: "horizontal"},
  {zoneId: "street-b", regionUuid: "Region.b", type: "street", streetAxis: "horizontal"},
  {zoneId: "room-a", regionUuid: "Region.c", type: "room", buildingId: "building-a"}
];

test("validates explicit zone definitions and graph references", () => {
  const result = validateZoneGraph({
    zones,
    edges: [
      {id: "edge-ab", from: "street-a", to: "street-b", type: "open"},
      {id: "edge-door", from: "street-a", to: "room-a", type: "door", doorUuid: "Wall.door"}
    ],
    sightLanes: {lane: {axis: "horizontal", zoneIds: ["street-a", "street-b"]}}
  });
  assert.equal(result.valid, true);
  assert.equal(validateZoneGraph({zones: [{zoneId: "room", regionUuid: "Region.r", type: "room"}]}).valid, false);
});

test("derives door movement and line-of-sight blocks from the Door state", () => {
  const closed = buildZoneGraph({
    zones,
    edges: [
      {id: "edge-ab", from: "street-a", to: "street-b", type: "open"},
      {id: "edge-door", from: "street-a", to: "room-a", type: "door", doorUuid: "Wall.door"}
    ],
    doorStates: {"Wall.door": {open: false}}
  });
  assert.deepEqual(getAdjacentZones(closed, "street-a"), ["street-b"]);
  assert.equal(findZonePath(closed, "street-a", "room-a"), null);

  const open = buildZoneGraph({
    zones,
    edges: [
      {id: "edge-ab", from: "street-a", to: "street-b", type: "open"},
      {id: "edge-door", from: "street-a", to: "room-a", type: "door", doorUuid: "Wall.door"}
    ],
    doorStates: {"Wall.door": {open: true}}
  });
  assert.deepEqual(findZonePath(open, "street-a", "room-a"), ["street-a", "room-a"]);
});
