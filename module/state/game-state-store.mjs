import {
  ACTIVE_MISSION_SCENE_SETTING,
  SCENE_STATE_FLAG,
  SYSTEM_ID
} from "../config/constants.mjs";
import {GameStateModel} from "./game-state-model.mjs";

export class StateRevisionError extends Error {
  constructor(expected, actual) {
    super(`State revision mismatch: expected ${expected}, found ${actual}.`);
    this.name = "StateRevisionError";
    this.code = "STALE_REVISION";
    this.expected = expected;
    this.actual = actual;
  }
}

export async function getActiveMissionScene() {
  const uuid = game.settings.get(SYSTEM_ID, ACTIVE_MISSION_SCENE_SETTING);
  if (!uuid) return null;
  const scene = await fromUuid(uuid);
  return scene?.documentName === "Scene" ? scene : null;
}

export async function setActiveMissionScene(scene) {
  if (!game.user.isGM) throw new Error("Only a GM may select the active mission Scene.");
  if (scene?.documentName !== "Scene") throw new TypeError("An active mission must be a Scene Document.");
  await game.settings.set(SYSTEM_ID, ACTIVE_MISSION_SCENE_SETTING, scene.uuid);
  return scene;
}

export async function loadGameState(scene) {
  if (scene?.documentName !== "Scene") throw new TypeError("Game state must be loaded from a Scene Document.");
  const source = scene.getFlag(SYSTEM_ID, SCENE_STATE_FLAG);
  return source ? GameStateModel.from(source) : GameStateModel.create({missionId: scene.id});
}

export async function saveGameState(scene, state, {expectedRevision} = {}) {
  if (!game.user.isGM) throw new Error("Only a GM may persist authoritative game state.");
  const current = await loadGameState(scene);
  if (expectedRevision !== undefined && current.revision !== expectedRevision) {
    throw new StateRevisionError(expectedRevision, current.revision);
  }

  const model = GameStateModel.from(state);
  if (expectedRevision !== undefined && model.revision !== expectedRevision + 1) {
    throw new StateRevisionError(expectedRevision + 1, model.revision);
  }

  await scene.setFlag(SYSTEM_ID, SCENE_STATE_FLAG, model.toObject());
  return model;
}

export async function ensureActiveMissionState() {
  const scene = await getActiveMissionScene();
  if (!scene) return null;
  const source = scene.getFlag(SYSTEM_ID, SCENE_STATE_FLAG);
  if (source) return loadGameState(scene);
  const initial = GameStateModel.create({missionId: scene.id});
  if (game.user.isGM) await scene.setFlag(SYSTEM_ID, SCENE_STATE_FLAG, initial.toObject());
  return initial;
}
