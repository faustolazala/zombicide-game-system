import test from "node:test";
import assert from "node:assert/strict";
import {
  getSurvivorsInZone,
  getTokenCenter,
  getTokenZone,
  getZombiesInZone
} from "../module/engine/zone/membership.mjs";

const regions = [
  {
    uuid: "Region.low",
    behaviors: [{type: "zombicideZone", system: {enabled: true, zoneId: "zone-low", membershipPriority: 0}}],
    containsPoint: point => point.x >= 0 && point.x < 100 && point.y >= 0 && point.y < 100
  },
  {
    uuid: "Region.high",
    behaviors: [{type: "zombicideZone", system: {enabled: true, zoneId: "zone-high", membershipPriority: 2}}],
    containsPoint: point => point.x >= 25 && point.x < 75 && point.y >= 25 && point.y < 75
  }
];

test("resolves token membership by center and priority", () => {
  assert.deepEqual(getTokenCenter({x: 0, y: 0, width: 1, height: 1, scene: {grid: {size: 100}}}), {x: 50, y: 50, elevation: 0});
  assert.equal(getTokenZone({center: {x: 50, y: 50}}, regions).zoneId, "zone-high");
  assert.equal(getTokenZone({center: {x: 10, y: 10}}, regions).zoneId, "zone-low");
  assert.equal(getTokenZone({center: {x: 200, y: 200}}, regions).zoneId, null);
});

test("flags equal-priority overlap as ambiguous and filters token types", () => {
  const overlap = regions.map(region => ({...region, behaviors: [{...region.behaviors[0], system: {...region.behaviors[0].system, membershipPriority: 1}}]}));
  assert.equal(getTokenZone({center: {x: 50, y: 50}}, overlap).ambiguous, true);
  const tokens = [
    {center: {x: 10, y: 10}, actor: {type: "survivor"}},
    {center: {x: 10, y: 10}, actor: {type: "zombie"}}
  ];
  assert.equal(getSurvivorsInZone(tokens, "zone-low", regions).length, 1);
  assert.equal(getZombiesInZone(tokens, "zone-low", regions).length, 1);
});
