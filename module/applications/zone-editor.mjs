import {getActiveMissionScene, loadGameState} from "../state/game-state-store.mjs";
import {
  getSceneZoneDefinitions,
  requestZoneCommand,
  validateSceneBoard,
  ZONE_COMMANDS
} from "../foundry/zone-commands.mjs";

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ApplicationV2} = foundry.applications.api;

export class ZombicideZoneEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["zombicide", "zone-editor"],
    position: {width: 760, height: 720},
    window: {resizable: true},
    actions: {
      saveZone: ZombicideZoneEditor._onSaveZone,
      configureGraph: ZombicideZoneEditor._onConfigureGraph,
      validateBoard: ZombicideZoneEditor._onValidateBoard,
      refresh: ZombicideZoneEditor._onRefresh
    }
  };

  static PARTS = {
    form: {template: "systems/zombicide/templates/zone/zone-editor.hbs"}
  };

  get title() {
    return game.i18n.localize("ZOMBICIDE.ZoneEditor.Title");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const scene = await getActiveMissionScene();
    if (!scene) return foundry.utils.mergeObject(context, {sceneName: "—", regions: [], graphJson: "{}", validation: null}, {inplace: false});
    const state = (await loadGameState(scene)).toObject();
    const definitions = new Map(getSceneZoneDefinitions(scene).map(zone => [zone.regionUuid, zone]));
    const regions = [...(scene.regions ?? [])].map(region => {
      const zone = definitions.get(region.uuid);
      return {
        uuid: region.uuid,
        name: region.name ?? region.id,
        configured: Boolean(zone),
        zoneId: zone?.zoneId ?? "",
        type: zone?.type ?? "special",
        isStreet: zone?.type === "street",
        isRoom: zone?.type === "room",
        isDark: zone?.type === "dark",
        isSpecial: !zone || zone.type === "special",
        isHorizontal: zone?.streetAxis === "horizontal",
        isVertical: zone?.streetAxis === "vertical",
        buildingId: zone?.buildingId ?? "",
        membershipPriority: zone?.membershipPriority ?? 0,
        searchable: Boolean(zone?.searchable),
        spawnZone: Boolean(zone?.spawnZone),
        objectiveZone: Boolean(zone?.objectiveZone),
        exitZone: Boolean(zone?.exitZone)
      };
    });
    const validation = validateSceneBoard(scene, state);
    return foundry.utils.mergeObject(context, {
      sceneName: scene.name,
      regions,
      graphJson: JSON.stringify(state.zoneGraph ?? {edges: [], sightLanes: {}, visibilityOverrides: []}, null, 2),
      validation
    }, {inplace: false});
  }

  static async _onRefresh() {
    await this.render({force: true});
  }

  static async _onSaveZone(_event, target) {
    const row = target.closest("[data-region-uuid]");
    if (!row) return;
    const read = name => row.querySelector(`[name='${name}']`)?.value ?? "";
    const checkbox = name => Boolean(row.querySelector(`[name='${name}']`)?.checked);
    try {
      await requestZoneCommand(ZONE_COMMANDS.SET_BEHAVIOR, {
        regionUuid: row.dataset.regionUuid,
        system: {
          zoneId: read("zoneId"),
          type: read("type"),
          streetAxis: read("streetAxis") || null,
          buildingId: read("buildingId") || null,
          membershipPriority: Number(read("membershipPriority") || 0),
          searchable: checkbox("searchable"),
          spawnZone: checkbox("spawnZone"),
          objectiveZone: checkbox("objectiveZone"),
          exitZone: checkbox("exitZone")
        }
      });
      ui.notifications.info(game.i18n.localize("ZOMBICIDE.ZoneEditor.Saved"));
      await this.render({force: true});
    } catch (error) {
      console.error("Zombicide | Zone save failed", error);
      ui.notifications.error(error.message);
    }
  }

  static async _onConfigureGraph() {
    const text = this.element.querySelector("[name='graphJson']")?.value ?? "{}";
    try {
      const graph = JSON.parse(text);
      await requestZoneCommand(ZONE_COMMANDS.CONFIGURE_GRAPH, graph);
      ui.notifications.info(game.i18n.localize("ZOMBICIDE.ZoneEditor.GraphSaved"));
      await this.render({force: true});
    } catch (error) {
      console.error("Zombicide | Graph save failed", error);
      ui.notifications.error(error.message);
    }
  }

  static async _onValidateBoard() {
    try {
      await requestZoneCommand(ZONE_COMMANDS.VALIDATE_BOARD);
      ui.notifications.info(game.i18n.localize("ZOMBICIDE.ZoneEditor.Valid"));
    } catch (error) {
      console.error("Zombicide | Board validation failed", error);
      ui.notifications.error(error.message);
    }
  }
}

export async function openZombicideZoneEditor() {
  if (!game.user.isGM) throw new Error("Only a GM may open the Zone Editor.");
  const editor = new ZombicideZoneEditor();
  await editor.render({force: true});
  return editor;
}
