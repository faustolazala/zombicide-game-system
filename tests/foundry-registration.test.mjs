import test from "node:test";
import assert from "node:assert/strict";

class DataField {
  constructor(...args) {
    this.args = args;
  }
}

class StubActor {}
class StubItem {}
class StubActorSheetV2 {}
class StubItemSheetV2 {}

globalThis.foundry = {
  abstract: {TypeDataModel: class {}},
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: Base => class extends Base {}
    },
    sheets: {
      ActorSheetV2: StubActorSheetV2,
      ItemSheetV2: StubItemSheetV2
    },
    apps: {
      DocumentSheetConfig: {
        registrations: [],
        registerSheet(...args) {
          this.registrations.push(args);
        }
      }
    }
  },
  data: {
    fields: {
      ArrayField: DataField,
      BooleanField: DataField,
      NumberField: DataField,
      ObjectField: DataField,
      SchemaField: DataField,
      StringField: DataField
    },
    regionBehaviors: {RegionBehaviorType: class {}}
  },
  utils: {
    mergeObject: (base, additions) => ({...base, ...additions})
  }
};
globalThis.Actor = StubActor;
globalThis.Item = StubItem;
globalThis.CONFIG = {
  Actor: {documentClass: StubActor, dataModels: {}},
  Item: {documentClass: StubItem, dataModels: {}},
  Card: {dataModels: {}},
  Cards: {dataModels: {}},
  RegionBehavior: {dataModels: {}, typeLabels: {}, typeIcons: {}}
};

const {registerDocumentsAndDataModels, registerSheets} = await import("../module/foundry/register-system.mjs");
const {electAuthority} = await import("../module/foundry/authority.mjs");

test("elects the lowest stable ID among active GMs", () => {
  const authority = electAuthority([
    {id: "gm-z", active: true, isGM: true},
    {id: "player-a", active: true, isGM: false},
    {id: "gm-b", active: false, isGM: true},
    {id: "gm-a", active: true, isGM: true}
  ]);
  assert.equal(authority.id, "gm-a");
});

test("registers every Milestone 1 TypeDataModel", () => {
  registerDocumentsAndDataModels();
  assert.deepEqual(Object.keys(CONFIG.Actor.dataModels), ["survivor", "zombie", "vehicle"]);
  assert.deepEqual(Object.keys(CONFIG.Item.dataModels), ["weapon", "equipment", "skill"]);
  assert.deepEqual(Object.keys(CONFIG.Card.dataModels), ["equipment", "spawn"]);
  assert.deepEqual(Object.keys(CONFIG.Cards.dataModels), [
    "equipmentDeck",
    "equipmentInPlay",
    "equipmentDiscard",
    "spawnDeck",
    "spawnDiscard"
  ]);
  assert.equal(CONFIG.RegionBehavior.dataModels.zombicideZone.name, "ZombicideZoneData");
  assert.equal(CONFIG.Actor.dataModels.survivor.defineSchema().adrenaline instanceof DataField, true);
  assert.equal(CONFIG.Item.dataModels.weapon.defineSchema().damage instanceof DataField, true);
  assert.equal(CONFIG.Card.dataModels.spawn.defineSchema().dangerEntries instanceof DataField, true);
});

test("registers default ApplicationV2 sheets for all Actor and Item types", () => {
  foundry.applications.apps.DocumentSheetConfig.registrations.length = 0;
  registerSheets();
  const registrations = foundry.applications.apps.DocumentSheetConfig.registrations;
  assert.equal(registrations.length, 4);
  assert.deepEqual(registrations[0][3].types, ["survivor"]);
  assert.deepEqual(registrations[1][3].types, ["zombie"]);
  assert.deepEqual(registrations[2][3].types, ["vehicle"]);
  assert.deepEqual(registrations[3][3].types, ["weapon", "equipment", "skill"]);
  assert.equal(registrations.every(([, scope]) => scope === "zombicide"), true);
});

test("initialization and ready hooks expose a usable system API", async () => {
  const onceHooks = new Map();
  const onHooks = new Map();
  globalThis.Hooks = {
    once: (name, callback) => onceHooks.set(name, callback),
    on: (name, callback) => onHooks.set(name, callback),
    callAll: () => {}
  };

  const users = [{id: "gm-1", active: true, isGM: true}];
  const userCollection = {
    get: id => users.find(user => user.id === id),
    [Symbol.iterator]: () => users.values()
  };
  const settingValues = new Map();
  globalThis.game = {
    version: "13.351",
    user: users[0],
    users: userCollection,
    i18n: {localize: key => key},
    settings: {
      register: (namespace, key, options) => settingValues.set(`${namespace}.${key}`, options.default),
      get: (namespace, key) => settingValues.get(`${namespace}.${key}`),
      set: async (namespace, key, value) => settingValues.set(`${namespace}.${key}`, value)
    },
    socket: {on: () => {}, emit: () => {}}
  };
  globalThis.ui = {notifications: {error: () => {}}};
  globalThis.fromUuid = async () => null;

  await import("../zombicide.mjs");
  assert.equal(typeof onceHooks.get("init"), "function");
  assert.equal(typeof onceHooks.get("ready"), "function");
  onceHooks.get("init")();
  await onceHooks.get("ready")();

  assert.equal(typeof game.zombicide.commands.request, "function");
  assert.equal(typeof game.zombicide.state.ensure, "function");
  assert.equal(typeof game.zombicide.createPlaceholderContent, "function");
  assert.equal(typeof game.zombicide.survivors.request, "function");
  assert.equal(typeof game.zombicide.zones.request, "function");
  assert.equal(typeof game.zombicide.zones.openEditor, "function");
  assert.equal(typeof game.zombicide.zones.openDebugOverlay, "function");
  assert.equal(typeof game.zombicide.zones.getTokenZone, "function");
  assert.equal(game.zombicide.survivors.commandTypes.START_ACTIVATION, "survivor.startActivation");
  assert.equal(onHooks.has("userConnected"), true);
});
