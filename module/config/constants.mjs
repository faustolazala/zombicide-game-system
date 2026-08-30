export const SYSTEM_ID = "zombicide";
export const SYSTEM_TITLE = "Zombicide Game System";
export const TARGET_FOUNDRY_VERSION = "13.351";
export const SOCKET_NAMESPACE = `system.${SYSTEM_ID}`;
export const SCENE_STATE_FLAG = "gameState";
export const ACTIVE_MISSION_SCENE_SETTING = "activeMissionSceneUuid";

export const ACTOR_TYPES = Object.freeze({
  SURVIVOR: "survivor",
  ZOMBIE: "zombie",
  VEHICLE: "vehicle"
});

export const ITEM_TYPES = Object.freeze({
  WEAPON: "weapon",
  EQUIPMENT: "equipment",
  SKILL: "skill"
});

export const CARD_TYPES = Object.freeze({
  EQUIPMENT: "equipment",
  SPAWN: "spawn"
});

export const CARDS_TYPES = Object.freeze({
  EQUIPMENT_DECK: "equipmentDeck",
  EQUIPMENT_IN_PLAY: "equipmentInPlay",
  EQUIPMENT_DISCARD: "equipmentDiscard",
  SPAWN_DECK: "spawnDeck",
  SPAWN_DISCARD: "spawnDiscard"
});
