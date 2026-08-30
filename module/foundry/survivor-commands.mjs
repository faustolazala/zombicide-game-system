import {CommandValidationError} from "../commands/command-service.mjs";
import {
  createActionState,
  getActionCost,
  refundActions,
  spendActions,
  SURVIVOR_ACTIONS
} from "../engine/survivor/action-economy.mjs";
import {
  discardInventoryItem,
  moveInventoryItem,
  transferInventoryItem
} from "../engine/survivor/inventory.mjs";
import {
  assignSurvivor,
  configureRoster,
  endActivation,
  setFirstPlayer,
  startActivation
} from "../engine/survivor/turn-engine.mjs";
import {
  applyWounds,
  gainAdrenaline,
  setAdrenaline,
  setWounds
} from "../engine/survivor/vitals.mjs";
import {documentPrecondition, updateDocumentChange} from "./document-transaction.mjs";
import {registerCommandHandler, requestCommand} from "./command-socket.mjs";
import {getActiveMissionScene, loadGameState} from "../state/game-state-store.mjs";

export const SURVIVOR_COMMANDS = Object.freeze({
  CONFIGURE_ROSTER: "survivor.configureRoster",
  ASSIGN: "survivor.assign",
  SET_FIRST_PLAYER: "survivor.setFirstPlayer",
  START_ACTIVATION: "survivor.startActivation",
  SPEND_ACTION: "survivor.spendAction",
  REFUND_ACTION: "survivor.refundAction",
  END_ACTIVATION: "survivor.endActivation",
  MOVE_ITEM: "survivor.moveItem",
  DISCARD_ITEM: "survivor.discardItem",
  TRADE_ITEM: "survivor.tradeItem",
  GAIN_ADRENALINE: "survivor.gainAdrenaline",
  SET_ADRENALINE: "survivor.setAdrenaline",
  APPLY_WOUNDS: "survivor.applyWounds",
  SET_WOUNDS: "survivor.setWounds"
});

function requester(context) {
  const user = game.users.get(context.requesterUserId);
  if (!user?.active) throw new CommandValidationError("INVALID_REQUESTER", "The requesting user is not active.");
  return user;
}

function requireGm(context) {
  const user = requester(context);
  if (!user.isGM) throw new CommandValidationError("GM_ONLY", "Only a GM may use this command.");
  return user;
}

async function requireSurvivor(uuid) {
  const actor = await fromUuid(uuid);
  if (actor?.documentName !== "Actor" || actor.type !== "survivor") {
    throw new CommandValidationError("INVALID_SURVIVOR", `'${uuid}' is not a Survivor Actor.`);
  }
  return actor;
}

function findAssignedPlayer(state, survivorUuid) {
  return Object.entries(state.survivorsByPlayer)
    .find(([, survivorUuids]) => Array.isArray(survivorUuids) && survivorUuids.includes(survivorUuid))?.[0] ?? null;
}

function requireTurnControl(state, survivorUuid, context) {
  const user = requester(context);
  const assignedPlayer = findAssignedPlayer(state, survivorUuid);
  if (!assignedPlayer) throw new CommandValidationError("SURVIVOR_NOT_ASSIGNED", "The Survivor is not assigned to a player.");
  if (!user.isGM && user.uuid !== assignedPlayer) {
    throw new CommandValidationError("SURVIVOR_NOT_CONTROLLED", "The Survivor is assigned to another player.");
  }
  if (state.activePlayerUserUuid !== assignedPlayer) {
    throw new CommandValidationError("NOT_ACTIVE_PLAYER", "The Survivor's assigned player is not active.");
  }
  return {user, assignedPlayer};
}

function actorSnapshot(actor) {
  return {
    uuid: actor.uuid,
    system: actor.system.toObject ? actor.system.toObject() : structuredClone(actor.system),
    items: actor.items.map(item => item.toObject())
  };
}

function inventorySource(actor) {
  return actor.toObject().system.inventory;
}

function itemSnapshot(item) {
  return {
    id: item.id,
    _id: item.id,
    type: item.type,
    system: item.system.toObject ? item.system.toObject() : structuredClone(item.system)
  };
}

function embeddedItemSource(item, id) {
  const source = item.toObject();
  delete source.folder;
  delete source.ownership;
  delete source._stats;
  source._id = id;
  return source;
}

async function validateRosterDocuments(payload) {
  for (const userUuid of payload.playerOrder ?? []) {
    const user = game.users.find(candidate => candidate.uuid === userUuid);
    if (!user) throw new CommandValidationError("INVALID_PLAYER", `'${userUuid}' is not a world User.`);
    for (const survivorUuid of payload.survivorsByPlayer?.[userUuid] ?? []) await requireSurvivor(survivorUuid);
  }
}

async function configureRosterHandler(state, command, context) {
  requireGm(context);
  await validateRosterDocuments(command.payload ?? {});
  const next = configureRoster(state, command.payload ?? {});
  return {state: next, events: [{type: "survivorRosterConfigured"}]};
}

async function assignHandler(state, command, context) {
  requireGm(context);
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  const user = game.users.find(candidate => candidate.uuid === command.payload?.playerUserUuid);
  if (!user) throw new CommandValidationError("INVALID_PLAYER", "The selected User does not exist.");
  const next = assignSurvivor(state, {playerUserUuid: user.uuid, survivorUuid: survivor.uuid});
  return {state: next, events: [{type: "survivorAssigned", survivorUuid: survivor.uuid, playerUserUuid: user.uuid}]};
}

async function setFirstPlayerHandler(state, command, context) {
  requireGm(context);
  const user = game.users.find(candidate => candidate.uuid === command.payload?.playerUserUuid);
  if (!user) throw new CommandValidationError("INVALID_PLAYER", "The selected User does not exist.");
  return {
    state: setFirstPlayer(state, user.uuid),
    events: [{type: "firstPlayerChanged", playerUserUuid: user.uuid}]
  };
}

async function startActivationHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  if (survivor.isEliminated) throw new CommandValidationError("SURVIVOR_ELIMINATED", "An eliminated Survivor cannot activate.");
  const {assignedPlayer} = requireTurnControl(state, survivor.uuid, context);
  const next = startActivation(state, {
    playerUserUuid: assignedPlayer,
    survivorUuid: survivor.uuid,
    actionState: createActionState(actorSnapshot(survivor))
  });
  return {state: next, events: [{type: "survivorActivationStarted", survivorUuid: survivor.uuid}]};
}

async function spendActionHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  requireTurnControl(state, survivor.uuid, context);
  if (state.activeSurvivorUuid !== survivor.uuid) {
    throw new CommandValidationError("SURVIVOR_NOT_ACTIVE", "This Survivor is not active.");
  }
  const action = SURVIVOR_ACTIONS[command.payload?.actionId];
  if (!action) throw new CommandValidationError("UNKNOWN_ACTION", "The selected Survivor action is not registered.");
  const nextActionState = spendActions(state.actionStateBySurvivorUuid[survivor.uuid], {
    transactionId: command.transactionId,
    actionId: action.id,
    actionType: action.actionType,
    cost: getActionCost(action)
  });
  state.actionStateBySurvivorUuid[survivor.uuid] = nextActionState;
  return {state, events: [{type: "survivorActionSpent", survivorUuid: survivor.uuid, actionId: action.id}]};
}

async function refundActionHandler(state, command, context) {
  requireGm(context);
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  const actionState = state.actionStateBySurvivorUuid[survivor.uuid];
  if (!actionState) throw new CommandValidationError("MISSING_ACTION_STATE", "The Survivor has no action state to refund.");
  state.actionStateBySurvivorUuid[survivor.uuid] = refundActions(actionState, {
    transactionId: command.transactionId,
    originalTransactionId: command.payload?.originalTransactionId
  });
  return {state, events: [{type: "survivorActionRefunded", survivorUuid: survivor.uuid}]};
}

async function endActivationHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  const {assignedPlayer} = requireTurnControl(state, survivor.uuid, context);
  const next = endActivation(state, {playerUserUuid: assignedPlayer, survivorUuid: survivor.uuid});
  return {state: next, events: [{type: "survivorActivationEnded", survivorUuid: survivor.uuid}]};
}

async function moveItemHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  requireTurnControl(state, survivor.uuid, context);
  const item = survivor.items.get(command.payload?.itemId);
  if (!item) throw new CommandValidationError("ITEM_NOT_FOUND", "The embedded Item was not found.");
  const inventory = moveInventoryItem(inventorySource(survivor), itemSnapshot(item), command.payload?.destination);
  return {
    state,
    changes: [updateDocumentChange(survivor, {"system.inventory": inventory})],
    events: [{type: "inventoryItemMoved", survivorUuid: survivor.uuid, itemUuid: item.uuid, destination: command.payload.destination}]
  };
}

async function discardItemHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  requireTurnControl(state, survivor.uuid, context);
  const item = survivor.items.get(command.payload?.itemId);
  if (!item) throw new CommandValidationError("ITEM_NOT_FOUND", "The embedded Item was not found.");
  if (item.system.sourceCardUuid) {
    throw new CommandValidationError("CARD_LIFECYCLE_DEFERRED", "Card-backed Items must wait for the Equipment Card lifecycle milestone.");
  }
  const inventory = discardInventoryItem(inventorySource(survivor), item.id);
  const preconditions = [documentPrecondition(survivor)];
  return {
    state,
    changes: [
      {...updateDocumentChange(survivor, {"system.inventory": inventory}), preconditions},
      {operation: "deleteEmbeddedDocuments", parentUuid: survivor.uuid, documentName: "Item", ids: [item.id], preconditions}
    ],
    events: [{type: "inventoryItemDiscarded", survivorUuid: survivor.uuid, itemUuid: item.uuid}]
  };
}

async function tradeItemHandler(state, command, context) {
  const source = await requireSurvivor(command.payload?.survivorUuid);
  const target = await requireSurvivor(command.payload?.targetSurvivorUuid);
  requireTurnControl(state, source.uuid, context);
  if (source.uuid === target.uuid) throw new CommandValidationError("INVALID_TRADE_TARGET", "Choose another Survivor for a trade.");
  if (!findAssignedPlayer(state, target.uuid)) {
    throw new CommandValidationError("TRADE_TARGET_NOT_ASSIGNED", "The receiving Survivor is not assigned in the current player order.");
  }
  const item = source.items.get(command.payload?.itemId);
  if (!item) throw new CommandValidationError("ITEM_NOT_FOUND", "The embedded Item was not found.");
  if (item.system.sourceCardUuid) {
    throw new CommandValidationError("CARD_LIFECYCLE_DEFERRED", "Card-backed Items must wait for the Equipment Card lifecycle milestone.");
  }

  const targetItemId = foundry.utils.randomID();
  const inventories = transferInventoryItem(
    inventorySource(source),
    inventorySource(target),
    itemSnapshot(item),
    targetItemId
  );
  const preconditions = [documentPrecondition(source), documentPrecondition(target)];
  return {
    state,
    changes: [
      {
        operation: "createEmbeddedDocuments",
        parentUuid: target.uuid,
        documentName: "Item",
        data: [embeddedItemSource(item, targetItemId)],
        keepId: true,
        preconditions
      },
      {...updateDocumentChange(source, {"system.inventory": inventories.sourceInventory}), preconditions},
      {...updateDocumentChange(target, {"system.inventory": inventories.targetInventory}), preconditions},
      {
        operation: "deleteEmbeddedDocuments",
        parentUuid: source.uuid,
        documentName: "Item",
        ids: [item.id],
        preconditions
      }
    ],
    events: [{type: "inventoryItemTraded", sourceSurvivorUuid: source.uuid, targetSurvivorUuid: target.uuid}]
  };
}

async function gainAdrenalineHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  requireTurnControl(state, survivor.uuid, context);
  const result = gainAdrenaline(survivor.system.adrenaline.value, command.payload?.amount ?? 1);
  return {
    state,
    changes: [updateDocumentChange(survivor, {"system.adrenaline.value": result.value})],
    events: [{type: "adrenalineChanged", survivorUuid: survivor.uuid, ...result, source: command.payload?.source ?? "manual"}]
  };
}

async function setAdrenalineHandler(state, command, context) {
  requireGm(context);
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  const result = setAdrenaline(survivor.system.adrenaline.value, command.payload?.value);
  return {
    state,
    changes: [updateDocumentChange(survivor, {"system.adrenaline.value": result.value})],
    events: [{type: "adrenalineChanged", survivorUuid: survivor.uuid, ...result, source: "gmOverride"}]
  };
}

function applyElimination(state, survivorUuid, result) {
  if (!result.eliminated) return state;
  state.flags.gameOver = true;
  state.phase = "end";
  state.activePlayerUserUuid = null;
  state.activeSurvivorUuid = null;
  if (state.actionStateBySurvivorUuid[survivorUuid]) {
    state.actionStateBySurvivorUuid[survivorUuid].status = "ended";
  }
  return state;
}

async function applyWoundsHandler(state, command, context) {
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  requireTurnControl(state, survivor.uuid, context);
  const result = applyWounds(actorSnapshot(survivor).system, command.payload?.amount ?? 1);
  applyElimination(state, survivor.uuid, result);
  const events = [{type: "woundsChanged", survivorUuid: survivor.uuid, ...result, source: command.payload?.source ?? "manual"}];
  if (result.eliminated) events.push({type: "missionDefeat", reason: "survivorEliminated", survivorUuid: survivor.uuid});
  return {
    state,
    changes: [updateDocumentChange(survivor, {"system.wounds.value": result.value})],
    events
  };
}

async function setWoundsHandler(state, command, context) {
  requireGm(context);
  const survivor = await requireSurvivor(command.payload?.survivorUuid);
  const result = setWounds(actorSnapshot(survivor).system, command.payload?.value);
  applyElimination(state, survivor.uuid, result);
  return {
    state,
    changes: [updateDocumentChange(survivor, {"system.wounds.value": result.value})],
    events: [{type: "woundsChanged", survivorUuid: survivor.uuid, ...result, source: "gmOverride"}]
  };
}

export function registerSurvivorCommands() {
  for (const [type, handler] of Object.entries(SURVIVOR_COMMAND_HANDLERS)) registerCommandHandler(type, handler);
}

export const SURVIVOR_COMMAND_HANDLERS = Object.freeze({
  [SURVIVOR_COMMANDS.CONFIGURE_ROSTER]: configureRosterHandler,
  [SURVIVOR_COMMANDS.ASSIGN]: assignHandler,
  [SURVIVOR_COMMANDS.SET_FIRST_PLAYER]: setFirstPlayerHandler,
  [SURVIVOR_COMMANDS.START_ACTIVATION]: startActivationHandler,
  [SURVIVOR_COMMANDS.SPEND_ACTION]: spendActionHandler,
  [SURVIVOR_COMMANDS.REFUND_ACTION]: refundActionHandler,
  [SURVIVOR_COMMANDS.END_ACTIVATION]: endActivationHandler,
  [SURVIVOR_COMMANDS.MOVE_ITEM]: moveItemHandler,
  [SURVIVOR_COMMANDS.DISCARD_ITEM]: discardItemHandler,
  [SURVIVOR_COMMANDS.TRADE_ITEM]: tradeItemHandler,
  [SURVIVOR_COMMANDS.GAIN_ADRENALINE]: gainAdrenalineHandler,
  [SURVIVOR_COMMANDS.SET_ADRENALINE]: setAdrenalineHandler,
  [SURVIVOR_COMMANDS.APPLY_WOUNDS]: applyWoundsHandler,
  [SURVIVOR_COMMANDS.SET_WOUNDS]: setWoundsHandler
});

export async function requestSurvivorCommand(type, payload = {}) {
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
