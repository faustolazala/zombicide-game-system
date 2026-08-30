import test from "node:test";
import assert from "node:assert/strict";
import {
  applyWounds,
  gainAdrenaline,
  getDangerLevel,
  getHighestDangerLevel,
  getMaximumWounds,
  setWounds
} from "../module/engine/survivor/vitals.mjs";

test("derives Modern 2E danger thresholds", () => {
  assert.equal(getDangerLevel(0), "blue");
  assert.equal(getDangerLevel(7), "yellow");
  assert.equal(getDangerLevel(19), "orange");
  assert.equal(getDangerLevel(43), "red");
  assert.deepEqual(gainAdrenaline(6, 14).crossedLevels, ["yellow", "orange"]);
});

test("derives maximum Wounds and immediate elimination", () => {
  const adult = {identity: {isKid: false}, wounds: {value: 2, maximumOverride: null}};
  const kid = {identity: {isKid: true}, wounds: {value: 1, maximumOverride: null}};
  assert.equal(getMaximumWounds(adult), 3);
  assert.equal(getMaximumWounds(kid), 2);
  assert.equal(applyWounds(adult, 1).eliminated, true);
  assert.equal(setWounds(kid, 2).eliminated, true);
});

test("reports the highest non-eliminated Survivor danger", () => {
  assert.equal(getHighestDangerLevel([
    {adrenaline: 7, eliminated: false},
    {adrenaline: 43, eliminated: true},
    {adrenaline: 19, eliminated: false}
  ]), "orange");
});
