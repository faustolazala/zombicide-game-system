function tokenCenter(token) {
  if (token?.center && Number.isFinite(token.center.x) && Number.isFinite(token.center.y)) return token.center;
  const x = Number(token?.x ?? 0);
  const y = Number(token?.y ?? 0);
  const width = Number(token?.width ?? 1);
  const height = Number(token?.height ?? 1);
  const gridSize = Number(token?.scene?.grid?.size ?? token?.parent?.grid?.size ?? 100);
  return {x: x + width * gridSize / 2, y: y + height * gridSize / 2, elevation: token?.elevation ?? 0};
}

function zoneBehavior(region) {
  const behaviors = region?.behaviors ?? region?.getEmbeddedCollection?.("RegionBehavior") ?? [];
  const list = Array.isArray(behaviors) ? behaviors : [...behaviors];
  return list.find(behavior => behavior.type === "zombicideZone" && behavior.system?.enabled !== false);
}

function containsPoint(region, point) {
  if (typeof region?.testPoint === "function") return region.testPoint(point);
  if (typeof region?.containsPoint === "function") return region.containsPoint(point);
  if (typeof region?.shape?.contains === "function") return region.shape.contains(point.x, point.y);
  return false;
}

export function getTokenZone(token, regions = []) {
  const point = tokenCenter(token);
  const matches = [];
  for (const region of regions) {
    const behavior = zoneBehavior(region);
    const zoneId = behavior?.system?.zoneId;
    if (!zoneId || !containsPoint(region, point)) continue;
    matches.push({
      zoneId,
      regionUuid: region.uuid ?? region.id ?? null,
      priority: Number.isInteger(behavior.system.membershipPriority) ? behavior.system.membershipPriority : 0
    });
  }
  if (!matches.length) return {zoneId: null, ambiguous: false, candidates: []};
  const highestPriority = Math.max(...matches.map(match => match.priority));
  const candidates = matches.filter(match => match.priority === highestPriority);
  return {
    zoneId: candidates.length === 1 ? candidates[0].zoneId : null,
    ambiguous: candidates.length > 1,
    candidates
  };
}

export function getTokensInZone(tokens = [], zoneId, regions = []) {
  return [...tokens].filter(token => getTokenZone(token, regions).zoneId === zoneId);
}

export function getSurvivorsInZone(tokens = [], zoneId, regions = []) {
  return getTokensInZone(tokens, zoneId, regions).filter(token => token.actor?.type === "survivor" || token.actor?.document?.type === "survivor");
}

export function getZombiesInZone(tokens = [], zoneId, regions = []) {
  return getTokensInZone(tokens, zoneId, regions).filter(token => token.actor?.type === "zombie" || token.actor?.document?.type === "zombie");
}

export function getTokenCenter(token) {
  return tokenCenter(token);
}
