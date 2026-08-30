const clone = value => structuredClone(value);

export function addNoise(noise = {}, zoneId, amount = 1, source = "unknown") {
  const value = Number.isInteger(amount) ? amount : 0;
  if (typeof zoneId !== "string" || !zoneId.length || value <= 0) return {noise: clone(noise), added: 0, zoneId, source};
  const next = clone(noise);
  next[zoneId] = Math.max(0, Number(next[zoneId] ?? 0)) + value;
  return {noise: next, added: value, zoneId, source};
}

export function removeNoise(noise = {}, zoneId, amount = 1) {
  const value = Number.isInteger(amount) ? amount : 0;
  const next = clone(noise);
  if (typeof zoneId !== "string" || value <= 0 || next[zoneId] === undefined) return {noise: next, removed: 0, zoneId};
  const removed = Math.min(Math.max(0, Number(next[zoneId] ?? 0)), value);
  next[zoneId] -= removed;
  if (next[zoneId] <= 0) delete next[zoneId];
  return {noise: next, removed, zoneId};
}

export function clearNoise(noise = {}) {
  return {noise: {}, cleared: Object.values(noise).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)};
}

export function getNoisiestZones(noise = {}) {
  return Object.entries(noise)
    .map(([zoneId, amount]) => ({zoneId, amount: Math.max(0, Number(amount) || 0)}))
    .filter(entry => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount || left.zoneId.localeCompare(right.zoneId));
}
