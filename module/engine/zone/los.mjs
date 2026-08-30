import {getTokenZone} from "./membership.mjs";

const asRecord = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function overrideValue(overrides, from, to) {
  const entry = (overrides ?? []).find(override =>
    (override.from === from && override.to === to) || (override.from === to && override.to === from)
  );
  return entry ? Boolean(entry.visible) : null;
}

function edgeBetween(graph, from, to) {
  return (graph?.adjacency?.[from] ?? []).find(edge => edge.to === to) ?? null;
}

function streetLanePath(lane, from, to) {
  const ids = Array.isArray(lane?.zoneIds) ? lane.zoneIds : [];
  const fromIndex = ids.indexOf(from);
  const toIndex = ids.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return null;
  const step = fromIndex < toIndex ? 1 : -1;
  const path = [];
  for (let index = fromIndex; step > 0 ? index <= toIndex : index >= toIndex; index += step) path.push(ids[index]);
  return path;
}

function sameStreetLane(fromZoneId, toZoneId, graph, sightLanes) {
  const fromZone = graph?.zones?.[fromZoneId];
  const toZone = graph?.zones?.[toZoneId];
  if (fromZone?.type !== "street" || toZone?.type !== "street") return false;
  return Object.values(asRecord(sightLanes)).some(lane => {
    const path = streetLanePath(lane, fromZoneId, toZoneId);
    if (!path) return false;
    for (let index = 1; index < path.length; index += 1) {
      const edge = edgeBetween(graph, path[index - 1], path[index]);
      if (!edge || edge.blocksLineOfSight) return false;
    }
    return true;
  });
}

export function canSeeZone(observerZoneId, targetZoneId, {graph, sightLanes = {}, visibilityOverrides = []} = {}) {
  if (!graph?.zones?.[observerZoneId] || !graph?.zones?.[targetZoneId]) return false;
  if (observerZoneId === targetZoneId) return true;
  const override = overrideValue(visibilityOverrides, observerZoneId, targetZoneId);
  if (override !== null) return override;

  const direct = edgeBetween(graph, observerZoneId, targetZoneId);
  if (direct && !direct.blocksLineOfSight) return true;
  return sameStreetLane(observerZoneId, targetZoneId, graph, sightLanes);
}

export function getVisibleZones(observerZoneId, context = {}) {
  return Object.keys(context.graph?.zones ?? {}).filter(zoneId => canSeeZone(observerZoneId, zoneId, context));
}

export function getVisibleSurvivorsForZombie(zoneId, tokens = [], regions = [], context = {}) {
  return getVisibleZones(zoneId, context).flatMap(visibleZone =>
    tokens.filter(token => {
      const actorType = token.actor?.type ?? token.actor?.document?.type;
      return actorType === "survivor" && getTokenZone(token, regions).zoneId === visibleZone;
    })
  );
}
