export const GAME_STATE_SCHEMA_VERSION = 1;
export const MAX_RECENT_TRANSACTION_IDS = 128;

export class GameStateValidationError extends Error {
  constructor(message, path = "gameState") {
    super(`${path}: ${message}`);
    this.name = "GameStateValidationError";
    this.path = path;
  }
}

const clone = value => structuredClone(value);

const isRecord = value => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const stringArray = value => Array.isArray(value)
  ? [...new Set(value.filter(entry => typeof entry === "string" && entry.length > 0))]
  : [];

const record = value => isRecord(value) ? clone(value) : {};

export function createInitialGameState({missionId = "", gameStarted = false} = {}) {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    revision: 0,
    lastTransactionId: null,
    recentTransactionIds: [],
    missionId,
    round: 1,
    phase: "survivor",
    firstPlayerUserUuid: null,
    playerOrder: [],
    activePlayerUserUuid: null,
    survivorsByPlayer: {},
    completedPlayerUserUuids: [],
    activeSurvivorUuid: null,
    activatedSurvivorUuids: [],
    actionStateBySurvivorUuid: {},
    noise: {},
    spawnOrder: [],
    buildingState: {},
    objectiveState: {},
    flags: {
      gameStarted,
      gameOver: false,
      automationPaused: false,
      pauseReason: null
    }
  };
}

const migrations = new Map([
  [0, source => ({
    ...createInitialGameState({
      missionId: typeof source.missionId === "string" ? source.missionId : "",
      gameStarted: Boolean(source.flags?.gameStarted)
    }),
    ...source,
    schemaVersion: 1
  })]
]);

export function registerGameStateMigration(fromVersion, migration) {
  if (!Number.isInteger(fromVersion) || fromVersion < 0 || typeof migration !== "function") {
    throw new TypeError("A migration needs a non-negative source version and a function.");
  }
  migrations.set(fromVersion, migration);
}

export function migrateGameState(source = {}) {
  if (!isRecord(source)) throw new GameStateValidationError("must be an object");
  let migrated = clone(source);
  let version = Number.isInteger(migrated.schemaVersion) ? migrated.schemaVersion : 0;

  if (version > GAME_STATE_SCHEMA_VERSION) {
    throw new GameStateValidationError(
      `schema version ${version} is newer than supported version ${GAME_STATE_SCHEMA_VERSION}`,
      "gameState.schemaVersion"
    );
  }

  while (version < GAME_STATE_SCHEMA_VERSION) {
    const migration = migrations.get(version);
    if (!migration) {
      throw new GameStateValidationError(`missing migration from version ${version}`, "gameState.schemaVersion");
    }
    migrated = migration(clone(migrated));
    const nextVersion = migrated.schemaVersion;
    if (!Number.isInteger(nextVersion) || nextVersion <= version) {
      throw new GameStateValidationError(`migration from version ${version} did not advance the schema`);
    }
    version = nextVersion;
  }

  return migrated;
}

function cleanNullableString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function cleanGameState(source) {
  const migrated = migrateGameState(source);
  const defaults = createInitialGameState();
  const flags = record(migrated.flags);

  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    revision: Number.isInteger(migrated.revision) ? migrated.revision : defaults.revision,
    lastTransactionId: cleanNullableString(migrated.lastTransactionId),
    recentTransactionIds: stringArray(migrated.recentTransactionIds).slice(-MAX_RECENT_TRANSACTION_IDS),
    missionId: typeof migrated.missionId === "string" ? migrated.missionId : defaults.missionId,
    round: Number.isInteger(migrated.round) ? migrated.round : defaults.round,
    phase: typeof migrated.phase === "string" ? migrated.phase : defaults.phase,
    firstPlayerUserUuid: cleanNullableString(migrated.firstPlayerUserUuid),
    playerOrder: stringArray(migrated.playerOrder),
    activePlayerUserUuid: cleanNullableString(migrated.activePlayerUserUuid),
    survivorsByPlayer: record(migrated.survivorsByPlayer),
    completedPlayerUserUuids: stringArray(migrated.completedPlayerUserUuids),
    activeSurvivorUuid: cleanNullableString(migrated.activeSurvivorUuid),
    activatedSurvivorUuids: stringArray(migrated.activatedSurvivorUuids),
    actionStateBySurvivorUuid: record(migrated.actionStateBySurvivorUuid),
    noise: record(migrated.noise),
    spawnOrder: stringArray(migrated.spawnOrder),
    buildingState: record(migrated.buildingState),
    objectiveState: record(migrated.objectiveState),
    flags: {
      gameStarted: Boolean(flags.gameStarted),
      gameOver: Boolean(flags.gameOver),
      automationPaused: Boolean(flags.automationPaused),
      pauseReason: cleanNullableString(flags.pauseReason)
    }
  };
}

function requireCondition(condition, message, path) {
  if (!condition) throw new GameStateValidationError(message, path);
}

export function validateGameState(state) {
  requireCondition(isRecord(state), "must be an object", "gameState");
  requireCondition(state.schemaVersion === GAME_STATE_SCHEMA_VERSION, "has an unsupported schema version", "gameState.schemaVersion");
  requireCondition(Number.isInteger(state.revision) && state.revision >= 0, "must be a non-negative integer", "gameState.revision");
  requireCondition(Number.isInteger(state.round) && state.round >= 1, "must be a positive integer", "gameState.round");
  requireCondition(["survivor", "zombie", "end", "setup"].includes(state.phase), "is not a supported phase", "gameState.phase");
  requireCondition(typeof state.missionId === "string", "must be a string", "gameState.missionId");

  for (const [path, value] of [
    ["recentTransactionIds", state.recentTransactionIds],
    ["playerOrder", state.playerOrder],
    ["completedPlayerUserUuids", state.completedPlayerUserUuids],
    ["activatedSurvivorUuids", state.activatedSurvivorUuids],
    ["spawnOrder", state.spawnOrder]
  ]) {
    requireCondition(Array.isArray(value) && value.every(entry => typeof entry === "string"), "must be an array of strings", `gameState.${path}`);
  }

  requireCondition(state.recentTransactionIds.length <= MAX_RECENT_TRANSACTION_IDS, "exceeds the bounded transaction history", "gameState.recentTransactionIds");
  for (const [path, value] of [
    ["survivorsByPlayer", state.survivorsByPlayer],
    ["actionStateBySurvivorUuid", state.actionStateBySurvivorUuid],
    ["noise", state.noise],
    ["buildingState", state.buildingState],
    ["objectiveState", state.objectiveState]
  ]) {
    requireCondition(isRecord(value), "must be an object", `gameState.${path}`);
  }
  requireCondition(isRecord(state.flags), "must be an object", "gameState.flags");
  requireCondition(typeof state.flags.gameStarted === "boolean", "must be a boolean", "gameState.flags.gameStarted");
  requireCondition(typeof state.flags.gameOver === "boolean", "must be a boolean", "gameState.flags.gameOver");
  requireCondition(typeof state.flags.automationPaused === "boolean", "must be a boolean", "gameState.flags.automationPaused");
  return true;
}

export class GameStateModel {
  #source;

  constructor(source) {
    const cleaned = cleanGameState(source);
    validateGameState(cleaned);
    this.#source = cleaned;
  }

  static create(options) {
    return new GameStateModel(createInitialGameState(options));
  }

  static from(source) {
    return source instanceof GameStateModel ? new GameStateModel(source.toObject()) : new GameStateModel(source);
  }

  get revision() {
    return this.#source.revision;
  }

  get schemaVersion() {
    return this.#source.schemaVersion;
  }

  toObject() {
    return clone(this.#source);
  }

  toJSON() {
    return this.toObject();
  }
}
