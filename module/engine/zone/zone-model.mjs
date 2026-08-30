import {assertRule} from "../rule-error.mjs";

export const ZONE_TYPES = Object.freeze(["street", "room", "dark", "special"]);
export const STREET_AXES = Object.freeze(["horizontal", "vertical"]);
export const EDGE_TYPES = Object.freeze(["open", "door", "blocked", "one-way", "special"]);

const clone = value => structuredClone(value);
const asArray = value => Array.isArray(value) ? value : [];
const asRecord = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export function normalizeZoneDefinition(source = {}) {
  const zone = {
    enabled: source.enabled !== false,
    zoneId: typeof source.zoneId === "string" ? source.zoneId.trim() : "",
    regionUuid: typeof source.regionUuid === "string" ? source.regionUuid : null,
    type: ZONE_TYPES.includes(source.type) ? source.type : "special",
    buildingId: typeof source.buildingId === "string" && source.buildingId.length ? source.buildingId : null,
    streetAxis: STREET_AXES.includes(source.streetAxis) ? source.streetAxis : null,
    membershipPriority: Number.isInteger(source.membershipPriority) ? source.membershipPriority : 0,
    searchable: Boolean(source.searchable),
    spawnZone: Boolean(source.spawnZone),
    objectiveZone: Boolean(source.objectiveZone),
    exitZone: Boolean(source.exitZone)
  };
  return zone;
}

export function validateZoneDefinitions(zones, {allowMissingBuilding = false} = {}) {
  const list = Array.isArray(zones)
    ? zones.map(normalizeZoneDefinition)
    : Object.entries(asRecord(zones)).map(([zoneId, source]) => normalizeZoneDefinition({zoneId, ...source}));
  const seen = new Set();
  const errors = [];
  for (const zone of list) {
    if (!zone.zoneId) errors.push({code: "MISSING_ZONE_ID", zone});
    else if (seen.has(zone.zoneId)) errors.push({code: "DUPLICATE_ZONE_ID", zoneId: zone.zoneId});
    else seen.add(zone.zoneId);
    if (!zone.regionUuid) errors.push({code: "MISSING_REGION_UUID", zoneId: zone.zoneId});
    if (["room", "dark"].includes(zone.type) && !zone.buildingId && !allowMissingBuilding) {
      errors.push({code: "MISSING_BUILDING_ID", zoneId: zone.zoneId});
    }
    if (zone.type === "street" && zone.buildingId) errors.push({code: "STREET_BUILDING_ID", zoneId: zone.zoneId});
    if (zone.type !== "street" && zone.streetAxis) errors.push({code: "NON_STREET_AXIS", zoneId: zone.zoneId});
  }
  return {valid: errors.length === 0, errors, zones: list};
}

function normalizeEdge(source = {}) {
  const type = EDGE_TYPES.includes(source.type) ? source.type : "open";
  const oneWay = type === "one-way" || Boolean(source.oneWay);
  return {
    id: typeof source.id === "string" ? source.id : "",
    from: typeof source.from === "string" ? source.from : "",
    to: typeof source.to === "string" ? source.to : "",
    type,
    doorUuid: typeof source.doorUuid === "string" ? source.doorUuid : null,
    direction: typeof source.direction === "string" ? source.direction : null,
    oneWay,
    blocksMovement: source.blocksMovement === undefined ? ["blocked", "door"].includes(type) : Boolean(source.blocksMovement),
    blocksLineOfSight: source.blocksLineOfSight === undefined ? ["blocked", "door"].includes(type) : Boolean(source.blocksLineOfSight)
  };
}

function resolveDoorOpen(edge, doorStates) {
  if (edge.type !== "door") return true;
  const state = edge.doorUuid ? doorStates?.[edge.doorUuid] : false;
  if (typeof state === "boolean") return state;
  if (state && typeof state === "object") return Boolean(state.open ?? state.state === "open");
  return false;
}

function derivedEdge(edge, doorStates) {
  const open = resolveDoorOpen(edge, doorStates);
  return {
    ...edge,
    open,
    blocksMovement: edge.type === "door" ? !open : edge.blocksMovement,
    blocksLineOfSight: edge.type === "door" ? !open : edge.blocksLineOfSight
  };
}

export function validateZoneGraph({zones = [], edges = [], sightLanes = {}} = {}) {
  const zoneResult = validateZoneDefinitions(zones);
  const zoneIds = new Set(zoneResult.zones.map(zone => zone.zoneId));
  const seenEdges = new Set();
  const errors = [...zoneResult.errors];
  const normalizedEdges = asArray(edges).map(normalizeEdge);
  for (const edge of normalizedEdges) {
    if (!edge.id) errors.push({code: "MISSING_EDGE_ID"});
    else if (seenEdges.has(edge.id)) errors.push({code: "DUPLICATE_EDGE_ID", edgeId: edge.id});
    else seenEdges.add(edge.id);
    if (!zoneIds.has(edge.from)) errors.push({code: "MISSING_EDGE_FROM", edgeId: edge.id, zoneId: edge.from});
    if (!zoneIds.has(edge.to)) errors.push({code: "MISSING_EDGE_TO", edgeId: edge.id, zoneId: edge.to});
    if (edge.type === "door" && !edge.doorUuid) errors.push({code: "MISSING_DOOR_UUID", edgeId: edge.id});
  }
  for (const [laneId, lane] of Object.entries(asRecord(sightLanes))) {
    const zoneLane = asRecord(lane);
    const laneZones = asArray(zoneLane.zoneIds);
    if (!STREET_AXES.includes(zoneLane.axis)) errors.push({code: "INVALID_SIGHT_LANE_AXIS", laneId});
    const unique = new Set(laneZones);
    if (unique.size !== laneZones.length) errors.push({code: "DUPLICATE_SIGHT_LANE_ZONE", laneId});
    for (const zoneId of laneZones) {
      if (!zoneIds.has(zoneId)) errors.push({code: "MISSING_SIGHT_LANE_ZONE", laneId, zoneId});
      else if (zoneResult.zones.find(zone => zone.zoneId === zoneId)?.type !== "street") {
        errors.push({code: "NON_STREET_SIGHT_LANE_ZONE", laneId, zoneId});
      }
    }
  }
  return {valid: errors.length === 0, errors, zones: zoneResult.zones, edges: normalizedEdges};
}

export function buildZoneGraph({zones = [], edges = [], doorStates = {}} = {}) {
  const validation = validateZoneGraph({zones, edges});
  assertRule(validation.valid, "INVALID_ZONE_GRAPH", "The Zone graph is invalid.", {errors: validation.errors});
  const zoneMap = Object.fromEntries(validation.zones.map(zone => [zone.zoneId, zone]));
  const adjacency = Object.fromEntries(validation.zones.map(zone => [zone.zoneId, []]));
  const derivedEdges = [];
  for (const source of validation.edges) {
    const edge = derivedEdge(source, doorStates);
    derivedEdges.push(edge);
    adjacency[edge.from].push({...edge, from: edge.from, to: edge.to});
    if (!edge.oneWay) adjacency[edge.to].push({...edge, from: edge.to, to: edge.from});
  }
  return {zones: zoneMap, edges: derivedEdges, adjacency};
}

export function getAdjacentZones(graph, zoneId, {movement = true} = {}) {
  return (graph?.adjacency?.[zoneId] ?? [])
    .filter(edge => !movement || !edge.blocksMovement)
    .map(edge => edge.to);
}

export function findZonePath(graph, fromZoneId, toZoneId, {maxSteps = Infinity} = {}) {
  if (fromZoneId === toZoneId) return [fromZoneId];
  if (!graph?.zones?.[fromZoneId] || !graph?.zones?.[toZoneId]) return null;
  const queue = [[fromZoneId]];
  const visited = new Set([fromZoneId]);
  while (queue.length) {
    const path = queue.shift();
    if (path.length - 1 >= maxSteps) continue;
    for (const next of getAdjacentZones(graph, path.at(-1))) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === toZoneId) return nextPath;
      visited.add(next);
      queue.push(nextPath);
    }
  }
  return null;
}

export function snapshotZoneGraph(config, doorStates) {
  return clone(buildZoneGraph({...config, doorStates}));
}
