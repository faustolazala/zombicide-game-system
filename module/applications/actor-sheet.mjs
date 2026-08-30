import {getActionsRemaining, SURVIVOR_ACTIONS} from "../engine/survivor/action-economy.mjs";
import {getItemLocation} from "../engine/survivor/inventory.mjs";
import {getSurvivorTurnProgress} from "../engine/survivor/turn-engine.mjs";
import {requestSurvivorCommand, SURVIVOR_COMMANDS} from "../foundry/survivor-commands.mjs";
import {getActiveMissionScene, loadGameState} from "../state/game-state-store.mjs";
import {SCENE_STATE_FLAG, SYSTEM_ID} from "../config/constants.mjs";

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

export class ZombicideActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["zombicide", "sheet", "actor"],
    position: {width: 580, height: 620},
    window: {resizable: true},
    actions: {
      assignSurvivor: ZombicideActorSheet._onAssignSurvivor,
      setFirstPlayer: ZombicideActorSheet._onSetFirstPlayer,
      startActivation: ZombicideActorSheet._onStartActivation,
      spendAction: ZombicideActorSheet._onSpendAction,
      endActivation: ZombicideActorSheet._onEndActivation,
      moveItem: ZombicideActorSheet._onMoveItem,
      discardItem: ZombicideActorSheet._onDiscardItem,
      tradeItem: ZombicideActorSheet._onTradeItem,
      gainAdrenaline: ZombicideActorSheet._onGainAdrenaline,
      decreaseAdrenaline: ZombicideActorSheet._onDecreaseAdrenaline,
      applyWound: ZombicideActorSheet._onApplyWound,
      healWound: ZombicideActorSheet._onHealWound
    },
    form: {
      closeOnSubmit: false,
      handler: ZombicideActorSheet._onSubmit
    }
  };

  static PARTS = {
    form: {template: "systems/zombicide/templates/actor/actor-sheet.hbs"}
  };

  get title() {
    const labels = {
      survivor: "ZOMBICIDE.Actor.Survivor",
      zombie: "ZOMBICIDE.Actor.Zombie",
      vehicle: "ZOMBICIDE.Actor.Vehicle"
    };
    return `${this.document.name} — ${game.i18n.localize(labels[this.document.type])}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const survivorContext = this.actor.type === "survivor"
      ? await this._prepareSurvivorContext()
      : {};
    return foundry.utils.mergeObject(context, {
      actor: this.actor,
      document: this.document,
      system: this.actor.system,
      actorType: this.actor.type,
      isSurvivor: this.actor.type === "survivor",
      isZombie: this.actor.type === "zombie",
      isVehicle: this.actor.type === "vehicle",
      editable: this.isEditable,
      items: this.actor.items.map(item => ({id: item.id, name: item.name, type: item.type})),
      ...survivorContext
    }, {inplace: false});
  }

  async _prepareSurvivorContext() {
    let missionState = null;
    try {
      const scene = await getActiveMissionScene();
      if (scene) missionState = (await loadGameState(scene)).toObject();
    } catch (error) {
      console.warn("Zombicide | Could not prepare Survivor turn context", error);
    }

    const inventory = this.actor.toObject().system.inventory;
    const assignedPlayerUserUuid = missionState
      ? Object.entries(missionState.survivorsByPlayer)
        .find(([, survivorUuids]) => Array.isArray(survivorUuids) && survivorUuids.includes(this.actor.uuid))?.[0] ?? null
      : null;
    const actionState = missionState?.actionStateBySurvivorUuid?.[this.actor.uuid] ?? null;
    const turnProgress = missionState
      ? getSurvivorTurnProgress(missionState)
      : {activatedCount: 0, totalCount: 0, pendingSurvivorUuids: []};
    const remaining = actionState
      ? getActionsRemaining(actionState)
      : {general: 0, restricted: 0, total: 0};
    const canControlTurn = Boolean(missionState) && (
      game.user.isGM || (
        assignedPlayerUserUuid === game.user.uuid
        && missionState.activePlayerUserUuid === game.user.uuid
      )
    );
    const isActive = missionState?.activeSurvivorUuid === this.actor.uuid;

    const users = [...game.users]
      .filter(user => user.active)
      .map(user => ({uuid: user.uuid, name: user.name, selected: user.uuid === assignedPlayerUserUuid}));
    const assignedSurvivorUuids = new Set(
      Object.values(missionState?.survivorsByPlayer ?? {})
        .flatMap(survivorUuids => Array.isArray(survivorUuids) ? survivorUuids : [])
    );
    const tradeTargets = [...game.actors]
      .filter(actor => actor.type === "survivor" && actor.uuid !== this.actor.uuid && assignedSurvivorUuids.has(actor.uuid))
      .map(actor => ({uuid: actor.uuid, name: actor.name}));
    const items = this.actor.items.map(item => ({
      id: item.id,
      uuid: item.uuid,
      name: item.name,
      type: item.type,
      inventoryLocation: getItemLocation(inventory, item.id) ?? "unassigned",
      isInventoryItem: ["weapon", "equipment"].includes(item.type),
      canEquipHand: item.type === "weapon" || item.system.slot === "hand",
      canEquipBody: item.type === "equipment" && item.system.slot === "body"
    }));

    const activePlayer = missionState?.activePlayerUserUuid
      ? game.users.find(user => user.uuid === missionState.activePlayerUserUuid)
      : null;
    const firstPlayer = missionState?.firstPlayerUserUuid
      ? game.users.find(user => user.uuid === missionState.firstPlayerUserUuid)
      : null;

    return {
      missionConfigured: Boolean(missionState?.playerOrder?.length),
      missionPhase: missionState?.phase ?? "setup",
      missionPhaseLabel: `ZOMBICIDE.Phase.${missionState?.phase ?? "setup"}`,
      missionRevision: missionState?.revision ?? 0,
      gameOver: Boolean(missionState?.flags?.gameOver),
      assignedPlayerUserUuid,
      activePlayerName: activePlayer?.name ?? "—",
      firstPlayerName: firstPlayer?.name ?? "—",
      activatedSurvivorCount: turnProgress.activatedCount,
      assignedSurvivorCount: turnProgress.totalCount,
      pendingSurvivors: turnProgress.pendingSurvivorUuids.map(uuid => ({
        uuid,
        name: game.actors.find(actor => actor.uuid === uuid)?.name ?? uuid
      })),
      isZombiePhase: missionState?.phase === "zombie",
      activationStatus: actionState?.status ?? "ready",
      actionsRemaining: remaining,
      isActiveSurvivor: isActive,
      canStartActivation: canControlTurn
        && missionState.phase === "survivor"
        && !missionState.activeSurvivorUuid
        && !missionState.activatedSurvivorUuids.includes(this.actor.uuid),
      canSpendActions: canControlTurn && isActive && actionState?.status === "active",
      canEndActivation: canControlTurn && isActive,
      canManageInventory: canControlTurn && isActive,
      canAdjustVitals: canControlTurn && isActive,
      actionButtons: Object.values(SURVIVOR_ACTIONS).map(action => ({
        id: action.id,
        label: `ZOMBICIDE.Actions.${action.id}`,
        remaining: actionState ? getActionsRemaining(actionState, action.actionType).total : 0
      })),
      isGm: game.user.isGM,
      users,
      tradeTargets,
      items,
      dangerLevel: this.actor.currentDangerLevel,
      dangerLabel: `ZOMBICIDE.Danger.${this.actor.currentDangerLevel}`,
      maximumWounds: this.actor.maximumWounds
    };
  }

  static async _runSurvivorCommand(app, type, payload) {
    try {
      const result = await requestSurvivorCommand(type, payload);
      await app.render({force: true});
      return result;
    } catch (error) {
      console.error("Zombicide | Survivor command failed", error);
      ui.notifications.error(error.message);
      return null;
    }
  }

  static _selectedValue(app, selector) {
    return app.element.querySelector(selector)?.value ?? "";
  }

  static async _onAssignSurvivor() {
    const playerUserUuid = ZombicideActorSheet._selectedValue(this, "[name='assignmentUserUuid']");
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.ASSIGN, {
      survivorUuid: this.actor.uuid,
      playerUserUuid
    });
  }

  static async _onSetFirstPlayer() {
    const playerUserUuid = ZombicideActorSheet._selectedValue(this, "[name='assignmentUserUuid']");
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.SET_FIRST_PLAYER, {playerUserUuid});
  }

  static async _onStartActivation() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.START_ACTIVATION, {
      survivorUuid: this.actor.uuid
    });
  }

  static async _onSpendAction(_event, target) {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.SPEND_ACTION, {
      survivorUuid: this.actor.uuid,
      actionId: target.dataset.actionType
    });
  }

  static async _onEndActivation() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.END_ACTIVATION, {
      survivorUuid: this.actor.uuid
    });
  }

  static async _onMoveItem(_event, target) {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.MOVE_ITEM, {
      survivorUuid: this.actor.uuid,
      itemId: target.dataset.itemId,
      destination: target.dataset.destination
    });
  }

  static async _onDiscardItem(_event, target) {
    if (!window.confirm(game.i18n.localize("ZOMBICIDE.Inventory.ConfirmDiscard"))) return null;
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.DISCARD_ITEM, {
      survivorUuid: this.actor.uuid,
      itemId: target.dataset.itemId
    });
  }

  static async _onTradeItem(_event, target) {
    const targetSurvivorUuid = ZombicideActorSheet._selectedValue(this, "[name='tradeTargetSurvivorUuid']");
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.TRADE_ITEM, {
      survivorUuid: this.actor.uuid,
      targetSurvivorUuid,
      itemId: target.dataset.itemId
    });
  }

  static async _onGainAdrenaline() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.GAIN_ADRENALINE, {
      survivorUuid: this.actor.uuid,
      amount: 1,
      source: "manualSheet"
    });
  }

  static async _onDecreaseAdrenaline() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.SET_ADRENALINE, {
      survivorUuid: this.actor.uuid,
      value: Math.max(0, this.actor.system.adrenaline.value - 1)
    });
  }

  static async _onApplyWound() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.APPLY_WOUNDS, {
      survivorUuid: this.actor.uuid,
      amount: 1,
      source: "manualSheet"
    });
  }

  static async _onHealWound() {
    return ZombicideActorSheet._runSurvivorCommand(this, SURVIVOR_COMMANDS.SET_WOUNDS, {
      survivorUuid: this.actor.uuid,
      value: Math.max(0, this.actor.system.wounds.value - 1)
    });
  }

  static async _onSubmit(event, form, formData) {
    event.preventDefault();
    await this.document.update(formData.object);
  }
}

export class SurvivorSheet extends ZombicideActorSheet {}
export class ZombieSheet extends ZombicideActorSheet {}
export class VehicleSheet extends ZombicideActorSheet {}

let missionStateSheetSyncRegistered = false;

export function registerMissionStateSheetSync() {
  if (missionStateSheetSyncRegistered || typeof Hooks === "undefined") return;
  missionStateSheetSyncRegistered = true;
  const statePath = `flags.${SYSTEM_ID}.${SCENE_STATE_FLAG}`;
  Hooks.on("updateScene", (_scene, changes) => {
    const stateChanged = Object.hasOwn(changes, statePath)
      || foundry.utils.hasProperty(changes, statePath);
    if (!stateChanged) return;
    for (const actor of game.actors ?? []) {
      if (actor.type !== "survivor" || !actor.sheet?.rendered) continue;
      Promise.resolve(actor.sheet.render({force: true})).catch(error => {
        console.warn("Zombicide | Could not refresh a Survivor sheet after mission state changed", error);
      });
    }
  });
}
