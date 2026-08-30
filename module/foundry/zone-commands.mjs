import {CommandValidationError} from "../commands/command-service.mjs";
import {getActiveMissionScene, loadGameState} from "../state/game-state-store.mjs";
import {addNoise, clearNoise} from "../engine/zone/noise.mjs";
import {revealBuildingOnDoorOpen} from "../engine/zone/building-reveal.mjs";
import {buildZoneGraph, normalizeZoneDefinition, validateZoneGraph} from "../engine/zone/zone-model.mjs";
import {getTokenZone} from "../engine/zone/membership.mjs";
import {documentPrecondition, updateDocumentChange} from "./document-transaction.mjs";
import {registerCommandHandler, requestCommand} from "./command-socket.mjs";

export const ZONE_COMMANDS = Object.freeze({
  SET_BEHAVIOR: "zone.setBehavior",
  CONFIGURE_GRAPH: "zone.configureGraph",
  VALIDATE_BOARD: "zone.validateBoard",
  SET_DOOR_STATE: "zone.setDoorState",
  ADD_NOISE: "zone.addNoise",
  CLEAR_NOISE: "zone.clearNoise"
});

function requester(context) {
  const user = game.users.get(context.requesterUserId);
  if (!user?.active) throw new CommandValidationError("INVALID_REQUESTER", "The requesting user is not active.");
  return user;
}

function requireGm(context) {
  const user = requester(context);
  if (!user.isGM) throw new CommandValidationError("GM_ONLY", "Only a GM may configure the Zone board.");
  return user;
}

function collectionEntries(collection) {
  return collection ? [...collection] : [];
}

function regionBehavior(region) {
  return collectionEntries(region?.behaviors ?? region?.getEmbeddedCollection?.("RegionBehavior"))
    .find(behavior => behavior.type === "zombicideZone");
}

function behaviorSource(region, behavior) {
  const system = behavior?.system?.toObject ? behavior.system.toObject() : structuredClone(behavior?.system ?? {});
  return normalizeZoneDefinition({...system, regionUuid: region.uuid});
}

export function getSceneZoneDefinitions(scene) {
  return collectionEntries(scene?.regions).flatMap(region => {
    const behavior = regionBehavior(region);
    if (!behavior || behavior.system?.enabled === false) return [];
    return [behaviorSource(region, behavior)];
  });
}

function doorOpenState(wall) {
  const open = globalThis.CONST?.WALL_DOOR_STATES?.OPEN ?? 1;
  return Number(wall?.ds ?? 0) === open;
}

export function getSceneDoorStates(scene) {
  return Object.fromEntries(collectionEntries(scene?.walls).map(wall => [wall.uuid, {open: doorOpenState(wall)}]));
}

export function getSceneZoneGraph(scene, state) {
  const config = state?.zoneGraph ?? {edges: [], sightLanes: {}, visibilityOverrides: []};
  return buildZoneGraph({
    zones: getSceneZoneDefinitions(scene),
    edges: config.edges ?? [],
    doorStates: getSceneDoorStates(scene)
  });
}

export function validateSceneBoard(scene, state) {
  const config = state?.zoneGraph ?? {edges: [], sightLanes: {}, visibilityOverrides: []};
  const result = validateZoneGraph({
    zones: getSceneZoneDefinitions(scene),
    edges: config.edges ?? [],
    sightLanes: config.sightLanes ?? {}
  });
  const errors = [...result.errors];
  const zoneIds = new Set(result.zones.map(zone => zone.zoneId));
  const walls = collectionEntries(scene?.walls);
  const wallUuids = new Set(walls.map(wall => wall.uuid));
  for (const edge of result.edges) {
    if (edge.type === "door" && edge.doorUuid && !wallUuids.has(edge.doorUuid)) {
      errors.push({code: "DOOR_NOT_FOUND", edgeId: edge.id, doorUuid: edge.doorUuid});
    }
  }

  const laneZoneIds = new Set(Object.values(config.sightLanes ?? {}).flatMap(lane => lane?.zoneIds ?? []));
  for (const zone of result.zones) {
    if (zone.type === "street" && !laneZoneIds.has(zone.zoneId)) {
      errors.push({code: "STREET_ZONE_WITHOUT_SIGHT_LANE", zoneId: zone.zoneId});
    }
  }

  const connected = new Map(result.zones.map(zone => [zone.zoneId, new Set()]));
  for (const edge of result.edges) {
    connected.get(edge.from)?.add(edge.to);
    connected.get(edge.to)?.add(edge.from);
  }
  const remaining = new Set(zoneIds);
  const components = [];
  while (remaining.size) {
    const start = remaining.values().next().value;
    const component = [];
    const queue = [start];
    remaining.delete(start);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const next of connected.get(current) ?? []) {
        if (remaining.delete(next)) queue.push(next);
      }
    }
    components.push(component);
  }
  if (components.length > 1) errors.push({code: "DISCONNECTED_ZONE_COMPONENTS", components});
  for (const zone of result.zones) {
    if (zone.spawnZone && !(connected.get(zone.zoneId)?.size)) {
      errors.push({code: "SPAWN_ZONE_WITHOUT_CONNECTION", zoneId: zone.zoneId});
    }
  }

  for (const token of collectionEntries(scene?.tokens)) {
    const membership = getTokenZone(token, collectionEntries(scene?.regions));
    if (!membership.zoneId) errors.push({code: "TOKEN_OUTSIDE_ZONES", tokenUuid: token.uuid});
    else if (membership.ambiguous) errors.push({code: "AMBIGUOUS_TOKEN_ZONE", tokenUuid: token.uuid, candidates: membership.candidates});
  }
  return {...result, valid: errors.length === 0, errors};
}

function requireSceneRegion(scene, uuid) {
  const region = collectionEntries(scene?.regions).find(candidate => candidate.uuid === uuid || candidate.id === uuid);
  if (!region) throw new CommandValidationError("REGION_NOT_FOUND", `Region '${uuid}' was not found on the active mission Scene.`);
  return region;
}

async function setBehaviorHandler(state, command, context) {
  requireGm(context);
  const scene = context.scene;
  const region = requireSceneRegion(scene, command.payload?.regionUuid);
  const current = regionBehavior(region);
  const payload = command.payload?.system ?? {};
  const existing = current?.system?.toObject ? current.system.toObject() : structuredClone(current?.system ?? {});
  const zone = normalizeZoneDefinition({...existing, ...payload, regionUuid: region.uuid});
  if (!zone.zoneId) throw new CommandValidationError("MISSING_ZONE_ID", "A Zombicide Zone requires a stable zone ID.");
  const {regionUuid: _regionUuid, ...zoneSystem} = zone;

  const duplicate = getSceneZoneDefinitions(scene).find(candidate => candidate.zoneId === zone.zoneId && candidate.regionUuid !== region.uuid);
  if (duplicate) throw new CommandValidationError("DUPLICATE_ZONE_ID", `Zone ID '${zone.zoneId}' is already used by another Region.`);

  const preconditions = [documentPrecondition(region)];
  const changes = current
    ? [{...updateDocumentChange(current, {system: zoneSystem}), preconditions}]
    : [{
      operation: "createEmbeddedDocuments",
      parentUuid: region.uuid,
      documentName: "RegionBehavior",
      data: [{name: "Zombicide Zone", type: "zombicideZone", system: zoneSystem}],
      preconditions
    }];
  return {
    state,
    changes,
    events: [{type: "zoneBehaviorChanged", zoneId: zone.zoneId, regionUuid: region.uuid}]
  };
}

async function configureGraphHandler(state, command, context) {
  requireGm(context);
  const payload = command.payload ?? {};
  const validation = validateZoneGraph({
    zones: getSceneZoneDefinitions(context.scene),
    edges: payload.edges ?? [],
    sightLanes: payload.sightLanes ?? {}
  });
  if (!validation.valid) {
    throw new CommandValidationError("INVALID_ZONE_GRAPH", "The Zone graph configuration is invalid.", {errors: validation.errors});
  }
  state.zoneGraph = {
    edges: structuredClone(payload.edges ?? []),
    sightLanes: structuredClone(payload.sightLanes ?? {}),
    visibilityOverrides: structuredClone(payload.visibilityOverrides ?? [])
  };
  return {state, events: [{type: "zoneGraphConfigured"}]};
}

async function validateBoardHandler(state, _command, context) {
  requireGm(context);
  const validation = validateSceneBoard(context.scene, state);
  if (!validation.valid) {
    throw new CommandValidationError("INVALID_ZONE_BOARD", "The Zone board failed validation.", {errors: validation.errors});
  }
  return {state, events: [{type: "zoneBoardValidated"}]};
}

async function setDoorStateHandler(state, command, context) {
  requireGm(context);
  const edgeId = command.payload?.edgeId;
  const wallUuid = command.payload?.doorUuid;
  const wall = await fromUuid(wallUuid);
  if (wall?.documentName !== "Wall") throw new CommandValidationError("DOOR_NOT_FOUND", `Wall '${wallUuid}' was not found.`);
  const graph = getSceneZoneGraph(context.scene, state);
  const edge = graph.edges.find(candidate => candidate.id === edgeId && candidate.doorUuid === wall.uuid);
  if (!edge) throw new CommandValidationError("DOOR_EDGE_NOT_FOUND", "The Zone graph has no matching Door edge.");
  const open = Boolean(command.payload?.open);
  const openState = globalThis.CONST?.WALL_DOOR_STATES?.OPEN ?? 1;
  const closedState = globalThis.CONST?.WALL_DOOR_STATES?.CLOSED ?? 0;
  const currentlyOpen = edge.open;
  const nextState = open
    ? revealBuildingOnDoorOpen(state.buildingState, graph, edgeId)
    : {buildingState: structuredClone(state.buildingState), revealed: false, buildingId: null};
  state.buildingState = nextState.buildingState;
  const noiseResult = open && !currentlyOpen
    ? addNoise(state.noise, edge.from, command.payload?.noiseAmount ?? 1, command.payload?.source ?? "door")
    : {noise: structuredClone(state.noise), added: 0};
  state.noise = noiseResult.noise;
  const events = [{type: "zoneDoorStateChanged", edgeId, doorUuid: wall.uuid, open}];
  if (nextState.revealed) events.push({type: "buildingRevealed", buildingId: nextState.buildingId, edgeId});
  if (noiseResult.added) events.push({type: "noiseAdded", zoneId: noiseResult.zoneId, amount: noiseResult.added, source: noiseResult.source});
  return {
    state,
    changes: [updateDocumentChange(wall, {ds: open ? openState : closedState})],
    events
  };
}

async function addNoiseHandler(state, command, context) {
  requireGm(context);
  const result = addNoise(state.noise, command.payload?.zoneId, command.payload?.amount, command.payload?.source ?? "manual");
  state.noise = result.noise;
  return {state, events: result.added ? [{type: "noiseAdded", ...result}] : []};
}

async function clearNoiseHandler(state, _command, context) {
  requireGm(context);
  const result = clearNoise(state.noise);
  state.noise = result.noise;
  return {state, events: [{type: "noiseCleared", cleared: result.cleared}]};
}

export const ZONE_COMMAND_HANDLERS = Object.freeze({
  [ZONE_COMMANDS.SET_BEHAVIOR]: setBehaviorHandler,
  [ZONE_COMMANDS.CONFIGURE_GRAPH]: configureGraphHandler,
  [ZONE_COMMANDS.VALIDATE_BOARD]: validateBoardHandler,
  [ZONE_COMMANDS.SET_DOOR_STATE]: setDoorStateHandler,
  [ZONE_COMMANDS.ADD_NOISE]: addNoiseHandler,
  [ZONE_COMMANDS.CLEAR_NOISE]: clearNoiseHandler
});

export function registerZoneCommands() {
  for (const [type, handler] of Object.entries(ZONE_COMMAND_HANDLERS)) registerCommandHandler(type, handler);
}

export async function requestZoneCommand(type, payload = {}) {
  const scene = await getActiveMissionScene();
  if (!scene) throw new CommandValidationError("NO_MISSION_SCENE", "No active mission Scene is configured.");
  const state = await loadGameState(scene);
  return requestCommand({
    transactionId: foundry.utils.randomID(24),
    expectedRevision: state.revision,
    type,
    payload: structuredClone(payload)
  });
}
