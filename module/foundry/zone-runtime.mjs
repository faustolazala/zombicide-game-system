import {
  getSurvivorsInZone,
  getTokenZone,
  getTokensInZone,
  getZombiesInZone
} from "../engine/zone/membership.mjs";
import {getSceneZoneDefinitions, getSceneZoneGraph} from "./zone-commands.mjs";
import {loadGameState} from "../state/game-state-store.mjs";

function sceneTokens(scene) {
  return scene?.tokens ? [...scene.tokens] : [];
}

function sceneRegions(scene) {
  return scene?.regions ? [...scene.regions] : [];
}

export function getTokenZoneInScene(token, scene = token?.scene ?? globalThis.canvas?.scene) {
  return getTokenZone(token, sceneRegions(scene));
}

export function getSceneTokensInZone(scene, zoneId) {
  return getTokensInZone(sceneTokens(scene), zoneId, sceneRegions(scene));
}

export function getSceneSurvivorsInZone(scene, zoneId) {
  return getSurvivorsInZone(sceneTokens(scene), zoneId, sceneRegions(scene));
}

export function getSceneZombiesInZone(scene, zoneId) {
  return getZombiesInZone(sceneTokens(scene), zoneId, sceneRegions(scene));
}

export async function getZoneDebugSnapshot(scene, state = null) {
  const missionState = state ?? (await loadGameState(scene)).toObject();
  const graph = getSceneZoneGraph(scene, missionState);
  return {
    zones: getSceneZoneDefinitions(scene),
    edges: graph.edges,
    tokens: sceneTokens(scene).map(token => ({
      uuid: token.uuid,
      name: token.name,
      actorType: token.actor?.type ?? token.actor?.document?.type ?? null,
      membership: getTokenZone(token, sceneRegions(scene))
    })),
    noise: structuredClone(missionState.noise ?? {}),
    buildingState: structuredClone(missionState.buildingState ?? {})
  };
}

let zoneRuntimeHooksRegistered = false;

export function registerZoneRuntimeHooks() {
  if (zoneRuntimeHooksRegistered || typeof Hooks === "undefined") return;
  zoneRuntimeHooksRegistered = true;
  Hooks.on("updateToken", token => {
    Hooks.callAll("zombicideZoneMembershipChanged", token, getTokenZoneInScene(token));
  });
  Hooks.on("updateWall", wall => {
    Hooks.callAll("zombicideZoneGraphInvalidated", wall);
  });
}
