import {registerSettings} from "./module/config/settings.mjs";
import {SYSTEM_ID, SYSTEM_TITLE, TARGET_FOUNDRY_VERSION} from "./module/config/constants.mjs";
import {registerAuthorityHooks, refreshAuthority} from "./module/foundry/authority.mjs";
import {
  registerCommandHandler,
  registerCommandSocket,
  requestCommand,
  unregisterCommandHandler
} from "./module/foundry/command-socket.mjs";
import {registerDocumentsAndDataModels, registerSheets} from "./module/foundry/register-system.mjs";
import {
  ensureActiveMissionState,
  getActiveMissionScene,
  loadGameState,
  saveGameState,
  setActiveMissionScene
} from "./module/state/game-state-store.mjs";
import {GameStateModel} from "./module/state/game-state-model.mjs";
import {createPlaceholderContent} from "./module/content/placeholder-content.mjs";

Hooks.once("init", () => {
  console.info(`${SYSTEM_TITLE} | Initializing for Foundry ${TARGET_FOUNDRY_VERSION}`);
  registerDocumentsAndDataModels();
  registerSheets();
  registerSettings();
  registerAuthorityHooks();

  game.zombicide = {
    GameStateModel,
    createPlaceholderContent,
    commands: {
      register: registerCommandHandler,
      unregister: unregisterCommandHandler,
      request: requestCommand
    },
    state: {
      ensure: ensureActiveMissionState,
      getActiveScene: getActiveMissionScene,
      load: loadGameState,
      save: saveGameState,
      setActiveScene: setActiveMissionScene
    }
  };
});

Hooks.once("ready", async () => {
  if (game.version !== TARGET_FOUNDRY_VERSION) {
    ui.notifications.error(
      `${SYSTEM_TITLE} targets Foundry ${TARGET_FOUNDRY_VERSION}; this server is ${game.version}.`,
      {permanent: true}
    );
  }
  refreshAuthority();
  registerCommandSocket();
  await ensureActiveMissionState();
  Hooks.callAll(`${SYSTEM_ID}Ready`, game.zombicide);
});
