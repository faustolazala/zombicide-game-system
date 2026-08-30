import {assertRule} from "../rule-error.mjs";

export const DANGER_THRESHOLDS = Object.freeze({blue: 0, yellow: 7, orange: 19, red: 43});
export const DANGER_LEVELS = Object.freeze(["blue", "yellow", "orange", "red"]);

export function getDangerLevel(adrenaline, thresholds = DANGER_THRESHOLDS) {
  const value = Math.max(0, Number.isFinite(adrenaline) ? adrenaline : 0);
  let level = "blue";
  for (const candidate of DANGER_LEVELS) {
    if (value >= thresholds[candidate]) level = candidate;
  }
  return level;
}

export function setAdrenaline(currentValue, nextValue, thresholds = DANGER_THRESHOLDS) {
  assertRule(Number.isInteger(nextValue) && nextValue >= 0, "INVALID_ADRENALINE", "Adrenaline must be a non-negative integer.");
  const previousLevel = getDangerLevel(currentValue, thresholds);
  const currentLevel = getDangerLevel(nextValue, thresholds);
  const previousIndex = DANGER_LEVELS.indexOf(previousLevel);
  const currentIndex = DANGER_LEVELS.indexOf(currentLevel);
  return {
    value: nextValue,
    previousLevel,
    currentLevel,
    crossedLevels: currentIndex > previousIndex
      ? DANGER_LEVELS.slice(previousIndex + 1, currentIndex + 1)
      : []
  };
}

export function gainAdrenaline(currentValue, amount, thresholds = DANGER_THRESHOLDS) {
  assertRule(Number.isInteger(amount) && amount > 0, "INVALID_ADRENALINE_GAIN", "Adrenaline gain must be a positive integer.");
  return setAdrenaline(currentValue, currentValue + amount, thresholds);
}

export function getMaximumWounds(survivorSystem) {
  const override = survivorSystem?.wounds?.maximumOverride;
  if (Number.isInteger(override) && override > 0) return override;
  return survivorSystem?.identity?.isKid ? 2 : 3;
}

export function setWounds(survivorSystem, value) {
  assertRule(Number.isInteger(value) && value >= 0, "INVALID_WOUNDS", "Wounds must be a non-negative integer.");
  const maximum = getMaximumWounds(survivorSystem);
  return {value, maximum, eliminated: value >= maximum};
}

export function applyWounds(survivorSystem, amount) {
  assertRule(Number.isInteger(amount) && amount > 0, "INVALID_WOUND_AMOUNT", "Wound amount must be a positive integer.");
  return setWounds(survivorSystem, survivorSystem.wounds.value + amount);
}

export function getHighestDangerLevel(survivors) {
  let highest = "blue";
  for (const survivor of survivors) {
    if (survivor.eliminated) continue;
    const level = getDangerLevel(survivor.adrenaline ?? survivor.system?.adrenaline?.value ?? 0);
    if (DANGER_LEVELS.indexOf(level) > DANGER_LEVELS.indexOf(highest)) highest = level;
  }
  return highest;
}
