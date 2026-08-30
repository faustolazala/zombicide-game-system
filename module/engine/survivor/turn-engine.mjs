import {assertRule} from "../rule-error.mjs";

const clone = value => structuredClone(value);
const uniqueStrings = values => [...new Set((values ?? []).filter(value => typeof value === "string" && value.length > 0))];

function assertNoActiveSurvivor(state) {
  assertRule(!state.activeSurvivorUuid, "ACTIVATION_IN_PROGRESS", "End the current Survivor activation before changing player setup.");
}

export function configureRoster(state, {playerOrder, survivorsByPlayer, firstPlayerUserUuid = null}) {
  const next = clone(state);
  assertNoActiveSurvivor(next);
  const order = uniqueStrings(playerOrder);
  assertRule(order.length > 0, "EMPTY_PLAYER_ORDER", "At least one player is required.");
  assertRule(order.length === (playerOrder ?? []).length, "DUPLICATE_PLAYER", "Player order contains duplicate or invalid users.");

  const assignments = {};
  const assignedSurvivors = new Set();
  for (const userUuid of order) {
    const survivors = uniqueStrings(survivorsByPlayer?.[userUuid]);
    assertRule(survivors.length > 0, "PLAYER_WITHOUT_SURVIVOR", "Every player in turn order must have at least one Survivor.", {userUuid});
    for (const survivorUuid of survivors) {
      assertRule(!assignedSurvivors.has(survivorUuid), "SURVIVOR_ASSIGNED_TWICE", "A Survivor may be assigned to only one player.", {survivorUuid});
      assignedSurvivors.add(survivorUuid);
    }
    assignments[userUuid] = survivors;
  }

  const firstPlayer = firstPlayerUserUuid ?? order[0];
  assertRule(order.includes(firstPlayer), "INVALID_FIRST_PLAYER", "The First Player must be in player order.");
  const firstIndex = order.indexOf(firstPlayer);
  next.playerOrder = order;
  next.survivorsByPlayer = assignments;
  next.firstPlayerUserUuid = firstPlayer;
  next.activePlayerUserUuid = order[firstIndex];
  next.completedPlayerUserUuids = [];
  next.activeSurvivorUuid = null;
  next.activatedSurvivorUuids = [];
  next.actionStateBySurvivorUuid = {};
  next.phase = "survivor";
  next.flags.gameStarted = true;
  return next;
}

export function assignSurvivor(state, {playerUserUuid, survivorUuid}) {
  const next = clone(state);
  assertNoActiveSurvivor(next);
  assertRule(typeof playerUserUuid === "string" && playerUserUuid.length > 0, "INVALID_PLAYER", "A player UUID is required.");
  assertRule(typeof survivorUuid === "string" && survivorUuid.length > 0, "INVALID_SURVIVOR", "A Survivor UUID is required.");

  for (const [userUuid, survivors] of Object.entries(next.survivorsByPlayer)) {
    next.survivorsByPlayer[userUuid] = survivors.filter(uuid => uuid !== survivorUuid);
  }
  if (!next.playerOrder.includes(playerUserUuid)) next.playerOrder.push(playerUserUuid);
  next.survivorsByPlayer[playerUserUuid] = uniqueStrings([
    ...(next.survivorsByPlayer[playerUserUuid] ?? []),
    survivorUuid
  ]);
  next.playerOrder = next.playerOrder.filter(userUuid => (next.survivorsByPlayer[userUuid] ?? []).length > 0);
  if (!next.firstPlayerUserUuid || !next.playerOrder.includes(next.firstPlayerUserUuid)) {
    next.firstPlayerUserUuid = next.playerOrder[0];
  }
  next.activePlayerUserUuid = next.firstPlayerUserUuid;
  next.completedPlayerUserUuids = [];
  next.activatedSurvivorUuids = [];
  next.actionStateBySurvivorUuid = {};
  next.phase = "survivor";
  next.flags.gameStarted = true;
  return next;
}

export function setFirstPlayer(state, playerUserUuid) {
  const next = clone(state);
  assertNoActiveSurvivor(next);
  assertRule(next.playerOrder.includes(playerUserUuid), "INVALID_FIRST_PLAYER", "The First Player must be in player order.");
  next.firstPlayerUserUuid = playerUserUuid;
  next.activePlayerUserUuid = playerUserUuid;
  next.completedPlayerUserUuids = [];
  next.activatedSurvivorUuids = [];
  next.actionStateBySurvivorUuid = {};
  next.phase = "survivor";
  return next;
}

export function startActivation(state, {playerUserUuid, survivorUuid, actionState}) {
  const next = clone(state);
  assertRule(!next.flags.gameOver, "GAME_OVER", "No Survivor can activate after the mission ends.");
  assertRule(next.phase === "survivor", "WRONG_PHASE", "Survivors may activate only during the Survivor Phase.");
  assertRule(next.activePlayerUserUuid === playerUserUuid, "NOT_ACTIVE_PLAYER", "Only the active player may start an activation.");
  assertRule((next.survivorsByPlayer[playerUserUuid] ?? []).includes(survivorUuid), "SURVIVOR_NOT_ASSIGNED", "This Survivor is not assigned to the active player.");
  assertRule(!next.activeSurvivorUuid, "ACTIVATION_IN_PROGRESS", "Another Survivor is already active.");
  assertRule(!next.activatedSurvivorUuids.includes(survivorUuid), "SURVIVOR_ALREADY_ACTIVATED", "This Survivor already activated this phase.");
  assertRule(actionState?.status === "ready", "INVALID_ACTION_STATE", "A fresh ready action state is required.");
  const activeActionState = clone(actionState);
  activeActionState.status = "active";
  next.activeSurvivorUuid = survivorUuid;
  next.actionStateBySurvivorUuid[survivorUuid] = activeActionState;
  return next;
}

export function endActivation(state, {playerUserUuid, survivorUuid}) {
  const next = clone(state);
  assertRule(next.phase === "survivor", "WRONG_PHASE", "A Survivor activation can end only during the Survivor Phase.");
  assertRule(next.activePlayerUserUuid === playerUserUuid, "NOT_ACTIVE_PLAYER", "Only the active player may end the activation.");
  assertRule(next.activeSurvivorUuid === survivorUuid, "SURVIVOR_NOT_ACTIVE", "This Survivor is not active.");
  const actionState = next.actionStateBySurvivorUuid[survivorUuid];
  assertRule(actionState?.status === "active", "INVALID_ACTION_STATE", "The Survivor does not have an active action state.");

  actionState.status = "ended";
  next.activeSurvivorUuid = null;
  next.activatedSurvivorUuids = uniqueStrings([...next.activatedSurvivorUuids, survivorUuid]);
  const assigned = next.survivorsByPlayer[playerUserUuid] ?? [];
  const playerComplete = assigned.every(uuid => next.activatedSurvivorUuids.includes(uuid));
  if (!playerComplete) return next;

  next.completedPlayerUserUuids = uniqueStrings([...next.completedPlayerUserUuids, playerUserUuid]);
  const currentIndex = next.playerOrder.indexOf(playerUserUuid);
  let nextPlayer = null;
  for (let offset = 1; offset <= next.playerOrder.length; offset += 1) {
    const candidate = next.playerOrder[(currentIndex + offset) % next.playerOrder.length];
    if (!next.completedPlayerUserUuids.includes(candidate)) {
      nextPlayer = candidate;
      break;
    }
  }

  if (nextPlayer) next.activePlayerUserUuid = nextPlayer;
  else {
    next.activePlayerUserUuid = null;
    next.phase = "zombie";
  }
  return next;
}
