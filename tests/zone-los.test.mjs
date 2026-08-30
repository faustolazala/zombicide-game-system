import test from "node:test";
import assert from "node:assert/strict";
import {canSeeZone, getVisibleZones} from "../module/engine/zone/los.mjs";
import {buildZoneGraph} from "../module/engine/zone/zone-model.mjs";

const graph = buildZoneGraph({
  zones: [
    {zoneId: "street-a", regionUuid: "Region.a", type: "street", streetAxis: "horizontal"},
    {zoneId: "street-b", regionUuid: "Region.b", type: "street", streetAxis: "horizontal"},
    {zoneId: "street-c", regionUuid: "Region.c", type: "street", streetAxis: "horizontal"},
    {zoneId: "room-a", regionUuid: "Region.d", type: "room", buildingId: "building-a"}
  ],
  edges: [
    {id: "edge-ab", from: "street-a", to: "street-b", type: "open"},
    {id: "edge-bc", from: "street-b", to: "street-c", type: "open"},
    {id: "edge-room", from: "street-a", to: "room-a", type: "door", doorUuid: "Wall.room"}
  ],
  doorStates: {"Wall.room": {open: true}}
});
const context = {graph, sightLanes: {lane: {axis: "horizontal", zoneIds: ["street-a", "street-b", "street-c"]}}};

test("street LOS follows configured lanes, not arbitrary graph paths", () => {
  assert.equal(canSeeZone("street-a", "street-c", context), true);
  assert.deepEqual(getVisibleZones("street-b", context), ["street-a", "street-b", "street-c"]);
});

test("closed doors block direct LOS and overrides are authoritative", () => {
  const closedGraph = buildZoneGraph({
    zones: Object.values(graph.zones),
    edges: graph.edges,
    doorStates: {"Wall.room": {open: false}}
  });
  assert.equal(canSeeZone("street-a", "room-a", {graph: closedGraph}), false);
  assert.equal(canSeeZone("street-a", "room-a", {graph: closedGraph, visibilityOverrides: [{from: "street-a", to: "room-a", visible: true}]}), true);
});
