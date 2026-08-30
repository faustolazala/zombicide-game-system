import {SOCKET_NAMESPACE} from "../config/constants.mjs";
import {applyCommand, CommandValidationError, noOperationHandler} from "../commands/command-service.mjs";
import {getActiveMissionScene, loadGameState, saveGameState} from "../state/game-state-store.mjs";
import {getAuthorityUser, isAuthority, refreshAuthority} from "./authority.mjs";

const PROTOCOL_VERSION = 1;
const REQUEST_TIMEOUT_MS = 15_000;
const handlers = new Map([["system.noop", noOperationHandler]]);
const pendingRequests = new Map();
let authorityQueue = Promise.resolve();
let socketRegistered = false;

export function registerCommandHandler(type, handler) {
  if (typeof type !== "string" || !type.length || typeof handler !== "function") {
    throw new TypeError("A command handler requires a non-empty type and a function.");
  }
  if (handlers.has(type)) throw new Error(`A handler is already registered for '${type}'.`);
  handlers.set(type, handler);
}

export function unregisterCommandHandler(type) {
  if (type === "system.noop") return false;
  return handlers.delete(type);
}

function serializeError(error) {
  return {
    name: error.name ?? "Error",
    code: error.code ?? "COMMAND_FAILED",
    message: error.message ?? String(error)
  };
}

function receiveResult(message) {
  if (message.requesterUserId !== game.user.id) return;
  const pending = pendingRequests.get(message.requestId);
  if (!pending) return;
  clearTimeout(pending.timeoutId);
  pendingRequests.delete(message.requestId);
  if (message.ok) pending.resolve(message.result);
  else {
    const error = new Error(message.error?.message ?? "The authority rejected the command.");
    Object.assign(error, message.error);
    pending.reject(error);
  }
}

async function executeRequest(message) {
  const scene = await getActiveMissionScene();
  if (!scene) throw new CommandValidationError("NO_MISSION_SCENE", "No active mission Scene is configured.");

  const handler = handlers.get(message.command?.type);
  const current = await loadGameState(scene);
  const result = await applyCommand(current, message.command, handler, {
    requesterUserId: message.requesterUserId,
    scene
  });

  if (result.changes.length > 0) {
    throw new CommandValidationError(
      "DOCUMENT_COMMIT_UNAVAILABLE",
      "Milestone 1 only accepts state-only commands; document change commits are added with the gameplay engines."
    );
  }

  await saveGameState(scene, result.state, {expectedRevision: result.previousRevision});
  return result;
}

async function handleRequest(message) {
  if (!isAuthority()) return;
  const requester = game.users.get(message.requesterUserId);
  if (!requester?.active) {
    throw new CommandValidationError("INVALID_REQUESTER", "The requesting user is not active.");
  }
  return executeRequest(message);
}

async function receiveSocketMessage(message) {
  if (!message || message.protocol !== PROTOCOL_VERSION) return;
  if (message.kind === "result") {
    receiveResult(message);
    Hooks.callAll("zombicideCommandResult", message);
    return;
  }
  if (message.kind !== "request" || !isAuthority()) return;

  authorityQueue = authorityQueue
    .then(async () => {
      try {
        const result = await handleRequest(message);
        game.socket.emit(SOCKET_NAMESPACE, {
          protocol: PROTOCOL_VERSION,
          kind: "result",
          requestId: message.requestId,
          requesterUserId: message.requesterUserId,
          authorityUserId: game.user.id,
          ok: true,
          result
        });
      } catch (error) {
        console.error("Zombicide | Command failed", error);
        game.socket.emit(SOCKET_NAMESPACE, {
          protocol: PROTOCOL_VERSION,
          kind: "result",
          requestId: message.requestId,
          requesterUserId: message.requesterUserId,
          authorityUserId: game.user.id,
          ok: false,
          error: serializeError(error)
        });
      }
    })
    .catch(error => console.error("Zombicide | Authority queue failure", error));
}

export function registerCommandSocket() {
  if (socketRegistered) return;
  game.socket.on(SOCKET_NAMESPACE, receiveSocketMessage);
  socketRegistered = true;
}

export function requestCommand(command) {
  const authority = getAuthorityUser() ?? (refreshAuthority(), getAuthorityUser());
  if (!authority) {
    return Promise.reject(new CommandValidationError("NO_AUTHORITY", "No active GM is available; automation is paused."));
  }
  if (!command?.transactionId) {
    return Promise.reject(new CommandValidationError("INVALID_TRANSACTION_ID", "A command requires a transactionId."));
  }

  const requestId = command.transactionId;
  if (pendingRequests.has(requestId)) {
    return Promise.reject(new CommandValidationError("REQUEST_PENDING", `Request '${requestId}' is already pending.`));
  }

  if (isAuthority()) {
    const message = {
      protocol: PROTOCOL_VERSION,
      kind: "request",
      requestId,
      requesterUserId: game.user.id,
      authorityUserId: authority.id,
      command: structuredClone(command)
    };
    const execution = authorityQueue.then(async () => {
      const result = await handleRequest(message);
      game.socket.emit(SOCKET_NAMESPACE, {
        protocol: PROTOCOL_VERSION,
        kind: "result",
        requestId,
        requesterUserId: game.user.id,
        authorityUserId: game.user.id,
        ok: true,
        result
      });
      return result;
    });
    authorityQueue = execution.catch(error => {
      console.error("Zombicide | Authority queue failure", error);
    });
    return execution;
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new CommandValidationError("COMMAND_TIMEOUT", `Command '${requestId}' timed out.`));
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(requestId, {resolve, reject, timeoutId});
    game.socket.emit(SOCKET_NAMESPACE, {
      protocol: PROTOCOL_VERSION,
      kind: "request",
      requestId,
      requesterUserId: game.user.id,
      authorityUserId: authority.id,
      command: structuredClone(command)
    });
  });
}
