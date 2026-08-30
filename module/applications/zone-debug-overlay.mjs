import {getActiveMissionScene} from "../state/game-state-store.mjs";
import {getZoneDebugSnapshot} from "../foundry/zone-runtime.mjs";

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export class ZombicideZoneDebugOverlay extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["zombicide", "zone-debug-overlay"],
    position: {width: 360, height: 420},
    window: {resizable: true},
    actions: {refresh: ZombicideZoneDebugOverlay._onRefresh}
  };

  static PARTS = {form: {template: "systems/zombicide/templates/zone/zone-debug-overlay.hbs"}};

  get title() {
    return game.i18n.localize("ZOMBICIDE.ZoneDebug.Title");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const scene = await getActiveMissionScene();
    if (!scene) return foundry.utils.mergeObject(context, {sceneName: "—", zones: [], tokens: [], noise: [], buildingState: {}}, {inplace: false});
    const snapshot = await getZoneDebugSnapshot(scene);
    return foundry.utils.mergeObject(context, {
      sceneName: scene.name,
      zones: snapshot.zones,
      tokens: snapshot.tokens,
      noise: Object.entries(snapshot.noise).sort((a, b) => b[1] - a[1]),
      buildingState: Object.entries(snapshot.buildingState)
    }, {inplace: false});
  }

  static async _onRefresh() {
    await this.render({force: true});
  }
}

export async function openZombicideZoneDebugOverlay() {
  if (!game.user.isGM) throw new Error("Only a GM may open the Zone Debug overlay.");
  const overlay = new ZombicideZoneDebugOverlay();
  await overlay.render({force: true});
  return overlay;
}
