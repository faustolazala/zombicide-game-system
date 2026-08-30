import {
  GameStateModel,
  MAX_RECENT_TRANSACTION_IDS
} from "../state/game-state-model.mjs";

export class CommandValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CommandValidationError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function validateCommandEnvelope(command) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new CommandValidationError("INVALID_COMMAND", "A command must be an object.");
  }
  if (typeof command.transactionId !== "string" || command.transactionId.length === 0) {
    throw new CommandValidationError("INVALID_TRANSACTION_ID", "A command requires a transactionId.");
  }
  if (!Number.isInteger(command.expectedRevision) || command.expectedRevision < 0) {
    throw new CommandValidationError("INVALID_REVISION", "A command requires a non-negative expectedRevision.");
  }
  if (typeof command.type !== "string" || command.type.length === 0) {
    throw new CommandValidationError("INVALID_COMMAND_TYPE", "A command requires a type.");
  }
  return command;
}

export async function applyCommand(stateSource, command, handler, context = {}) {
  validateCommandEnvelope(command);
  if (typeof handler !== "function") {
    throw new CommandValidationError("UNKNOWN_COMMAND", `No handler is registered for command type '${command.type}'.`);
  }

  const current = GameStateModel.from(stateSource).toObject();
  if (command.expectedRevision !== current.revision) {
    throw new CommandValidationError(
      "STALE_REVISION",
      `Expected revision ${command.expectedRevision}, found ${current.revision}.`,
      {expected: command.expectedRevision, actual: current.revision}
    );
  }
  if (current.lastTransactionId === command.transactionId || current.recentTransactionIds.includes(command.transactionId)) {
    throw new CommandValidationError(
      "DUPLICATE_TRANSACTION",
      `Transaction '${command.transactionId}' was already applied.`,
      {transactionId: command.transactionId}
    );
  }

  const workingState = structuredClone(current);
  const outcome = await handler(workingState, structuredClone(command), context) ?? {};
  const proposedState = outcome.state ?? workingState;
  const committed = {
    ...proposedState,
    schemaVersion: current.schemaVersion,
    revision: current.revision + 1,
    lastTransactionId: command.transactionId,
    recentTransactionIds: [...current.recentTransactionIds, command.transactionId]
      .slice(-MAX_RECENT_TRANSACTION_IDS)
  };

  const state = GameStateModel.from(committed).toObject();
  return {
    transactionId: command.transactionId,
    previousRevision: current.revision,
    revision: state.revision,
    state,
    changes: Array.isArray(outcome.changes) ? structuredClone(outcome.changes) : [],
    events: Array.isArray(outcome.events) ? structuredClone(outcome.events) : []
  };
}

export async function noOperationHandler(state, command) {
  return {
    state,
    events: [{type: "commandAccepted", commandType: command.type}]
  };
}
