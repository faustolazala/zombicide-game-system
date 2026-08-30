import {
  ACTIVE_MISSION_SCENE_SETTING,
  SYSTEM_ID
} from "./constants.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, ACTIVE_MISSION_SCENE_SETTING, {
    name: "ZOMBICIDE.Settings.ActiveMissionScene.Name",
    hint: "ZOMBICIDE.Settings.ActiveMissionScene.Hint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}
