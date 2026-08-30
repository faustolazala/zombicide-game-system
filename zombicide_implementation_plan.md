# Zombicide for Foundry VTT — Codex Implementation Plan

## 0. Purpose

Build a **standalone Foundry Virtual Tabletop Game System** for playing a Zombicide-style cooperative board game, with **Zombicide 2nd Edition as the initial rules baseline** and **Foundry VTT 13.351** as the initial platform target.

The project should automate the repetitive bookkeeping that Foundry can reliably handle while preserving GM/player control over ambiguous or scenario-specific decisions.

The first implementation must be usable with **original placeholder content and user-supplied game assets**. Do **not** bundle copyrighted CMON/Guillotine Games artwork, map tiles, card images, survivor likenesses, logos, rulebook text, or other proprietary assets unless the repository owner later provides explicit rights to distribute them.

The architecture must be designed so that later rulesets can be added without rewriting the core engine, including:

- Zombicide Classic
- Zombicide Fantasy
- Zombicide Sci-Fi
- Zombicide Western
- Future/custom variants

---

# 1. Instructions to Codex

Treat this document as the implementation specification.

Before writing substantial code:

1. Inspect the repository.
2. Confirm that a runnable Foundry VTT 13.351 installation is available and record that exact verified build in `IMPLEMENTATION_STATUS.md`.
3. Read the Foundry v13 system-development and API documentation applicable to build 13.351. Use `ApplicationV2`, `ActorSheetV2`, `ItemSheetV2`, `HandlebarsApplicationMixin`, and current v13 registration APIs unless build verification requires a documented adjustment.
4. Do not blindly use old Foundry examples if the current API differs.
5. Create an implementation checklist in `IMPLEMENTATION_STATUS.md`.
6. Implement the system incrementally.
7. Keep the project runnable after every milestone.
8. Add automated tests for game-rule logic wherever practical.
9. Keep rules logic separate from Foundry UI/API glue.
10. Avoid introducing dependencies unless they provide a clear benefit.
11. Prefer standard Foundry Documents, DataModels, Regions, Cards, RollTables, settings, hooks, and applications before inventing custom persistence layers.
12. When a rule is uncertain, parameterize it or leave a documented TODO rather than hard-coding an assumption.
13. Use the official Zombicide 2nd Edition rules as the rules authority.
14. Do not reproduce substantial copyrighted rulebook text in source files or documentation. Implement behavior, not copied prose.

The end result should be a maintainable Foundry system, not a collection of macros.

---

# 2. Product Goals

The system should allow a GM and players to run a complete Zombicide 2nd Edition game in Foundry with substantially less bookkeeping than the physical board game.

## Primary goals

- Survivor character sheets.
- Zombie Actors/Tokens.
- Weapon and equipment management.
- Inventory and hand slots.
- Actions-per-turn tracking.
- Adrenaline/Danger Level tracking.
- Skill unlocks.
- Zombicide-style Zones.
- Doors and zone connectivity.
- Noise tracking.
- Search/equipment draw workflows.
- Combat rolls.
- Targeting priority.
- Friendly-fire handling.
- Zombie activation.
- Zombie pathfinding.
- Zombie spawning.
- Runner multi-action behavior.
- Extra activations and other spawn-card effects.
- Survivor/Zombie/End phase state machine.
- Mission objectives.
- Mission victory/defeat conditions.
- Vehicle and car actions required for the Modern 2E v1.0 rules baseline.
- GM controls for overriding automation.
- Chat log of important game events.
- Save/reload-safe game state.

## Secondary goals

- Mission builder.
- Board validation tools.
- Compendium support.
- Custom survivor/equipment editors.
- Rule variants.
- Additional Zombicide families.
- Import/export of user-created content.
- Optional visual effects and sounds.
- Optional fully automated zombie phase.

---

# 3. Non-Goals for the Initial Release

Do **not** make the MVP depend on:

- Commercial Zombicide art.
- Scanned map tiles.
- OCR of cards.
- External web services.
- AI/LLM decision-making.
- 3D rendering.
- Automated recreation of official missions.
- Automated import of copyrighted PDFs.
- Support for every Zombicide expansion.
- Perfect automation of every unusual skill/card interaction.
- Cars during the first playable MVP. Cars are required before v1.0, but the MVP test mission must not depend on them.

The rules engine should provide hooks/overrides so rare exceptions can be handled manually.

---

# 4. Architectural Principle

Use a layered architecture:

```text
┌─────────────────────────────────────────────┐
│              Foundry UI Layer               │
│ Sheets / Dialogs / HUD / Chat / Controls   │
├─────────────────────────────────────────────┤
│            Foundry Adapter Layer            │
│ Actors / Items / Regions / Cards / Hooks   │
├─────────────────────────────────────────────┤
│              Game Engine Layer              │
│ Actions / Combat / AI / Turns / Missions   │
├─────────────────────────────────────────────┤
│             Rules/Data Layer                │
│ Ruleset definitions / profiles / schemas   │
└─────────────────────────────────────────────┘
```

The **Game Engine Layer must be as Foundry-independent as practical**.

For example:

```javascript
resolveAttack(attacker, weapon, targets, context)
chooseZombieTarget(zombieGroup, boardState)
calculateZombieRoutes(startZone, targetZone, zoneGraph)
resolveSpawnCard(card, spawnZone, dangerLevel, state)
```

These should ideally accept plain JavaScript objects and return deterministic results/events.

Foundry-specific code then applies those results to Actors, Items, Tokens, Regions, Cards, ChatMessages, and settings.

This separation is critical for testing.

---

# 5. Proposed Repository Structure

Codex may adjust names to match current Foundry conventions, but preserve this separation of concerns.

```text
zombicide-foundry/
│
├── system.json
├── zombicide.mjs
├── README.md
├── CHANGELOG.md
├── LICENSE
├── IMPLEMENTATION_STATUS.md
│
├── module/
│   ├── config/
│   │   ├── constants.mjs
│   │   ├── settings.mjs
│   │   └── ruleset-registry.mjs
│   │
│   ├── data/
│   │   ├── actors/
│   │   │   ├── survivor-data.mjs
│   │   │   ├── zombie-data.mjs
│   │   │   └── vehicle-data.mjs
│   │   ├── items/
│   │   │   ├── weapon-data.mjs
│   │   │   ├── equipment-data.mjs
│   │   │   ├── skill-data.mjs
│   │   │   └── objective-data.mjs
│   │   ├── cards/
│   │   │   ├── equipment-card-data.mjs
│   │   │   └── spawn-card-data.mjs
│   │   └── migrations/
│   │
│   ├── documents/
│   │   ├── zombicide-actor.mjs
│   │   ├── zombicide-item.mjs
│   │   └── helpers.mjs
│   │
│   ├── engine/
│   │   ├── actions/
│   │   │   ├── action-engine.mjs
│   │   │   ├── action-validator.mjs
│   │   │   └── action-costs.mjs
│   │   ├── combat/
│   │   │   ├── attack-engine.mjs
│   │   │   ├── dice-engine.mjs
│   │   │   ├── target-priority.mjs
│   │   │   └── friendly-fire.mjs
│   │   ├── board/
│   │   │   ├── zone-graph.mjs
│   │   │   ├── zone-membership.mjs
│   │   │   ├── line-of-sight.mjs
│   │   │   ├── sight-lanes.mjs
│   │   │   ├── buildings.mjs
│   │   │   ├── doors.mjs
│   │   │   └── noise.mjs
│   │   ├── commands/
│   │   │   ├── command-service.mjs
│   │   │   ├── transaction.mjs
│   │   │   └── command-validator.mjs
│   │   ├── zombies/
│   │   │   ├── activation-engine.mjs
│   │   │   ├── target-selection.mjs
│   │   │   ├── pathfinding.mjs
│   │   │   ├── split-routes.mjs
│   │   │   └── spawn-engine.mjs
│   │   ├── turns/
│   │   │   ├── phase-machine.mjs
│   │   │   ├── survivor-turn.mjs
│   │   │   ├── zombie-phase.mjs
│   │   │   └── end-phase.mjs
│   │   ├── missions/
│   │   │   ├── mission-engine.mjs
│   │   │   ├── objective-engine.mjs
│   │   │   └── condition-engine.mjs
│   │   ├── events/
│   │   │   ├── game-event.mjs
│   │   │   └── event-log.mjs
│   │   └── vehicles/
│   │   │   ├── vehicle-engine.mjs
│   │   │   └── occupancy.mjs
│   │
│   ├── foundry/
│   │   ├── regions/
│   │   │   ├── zone-region.mjs
│   │   │   ├── zone-behavior.mjs
│   │   │   └── region-utils.mjs
│   │   ├── cards/
│   │   │   ├── equipment-deck.mjs
│   │   │   ├── equipment-item-links.mjs
│   │   │   └── spawn-deck.mjs
│   │   ├── state/
│   │   │   ├── game-state-model.mjs
│   │   │   ├── game-state-store.mjs
│   │   │   └── state-migrations.mjs
│   │   ├── tokens/
│   │   │   ├── token-hooks.mjs
│   │   │   └── token-hud.mjs
│   │   ├── chat/
│   │   │   └── chat-cards.mjs
│   │   └── sockets/
│   │       ├── authority.mjs
│   │       └── command-socket.mjs
│   │
│   ├── applications/
│   │   ├── survivor-sheet.mjs
│   │   ├── zombie-sheet.mjs
│   │   ├── vehicle-sheet.mjs
│   │   ├── weapon-sheet.mjs
│   │   ├── equipment-sheet.mjs
│   │   ├── skill-sheet.mjs
│   │   ├── game-dashboard.mjs
│   │   ├── mission-dashboard.mjs
│   │   ├── zone-editor.mjs
│   │   └── spawn-manager.mjs
│   │
│   ├── rulesets/
│   │   ├── base/
│   │   │   ├── base-ruleset.mjs
│   │   │   └── rule-interfaces.mjs
│   │   └── modern-2e/
│   │       ├── ruleset.mjs
│   │       ├── danger-levels.mjs
│   │       ├── zombie-types.mjs
│   │       ├── targeting.mjs
│   │       └── defaults.mjs
│   │
│   └── utils/
│       ├── logger.mjs
│       ├── uuid.mjs
│       └── validation.mjs
│
├── templates/
│   ├── actor/
│   ├── item/
│   ├── apps/
│   └── chat/
│
├── styles/
│   ├── zombicide.css
│   ├── sheets.css
│   └── dashboard.css
│
├── lang/
│   ├── en.json
│   └── es.json
│
├── packs/
│   └── placeholder-content/
│
└── tests/
    ├── actions/
    ├── combat/
    ├── board/
    ├── cards/
    ├── commands/
    ├── zombies/
    ├── turns/
    ├── missions/
    └── vehicles/
```

---

# 6. Foundry Game System Manifest

Create a normal Foundry **Game System**, not a module layered on another RPG.

The root `system.json` must define:

- System ID.
- Title.
- Description.
- Version.
- Compatible Foundry versions.
- ES module entry point.
- Styles.
- Languages.
- Actor document types.
- Item document types.
- Cards and Card document types used for equipment and spawn decks.
- Compendium packs as appropriate.
- Socket support if needed.
- RegionBehavior document subtypes used by the system.

Suggested ID:

```text
zombicide
```

If legal/trademark considerations make that undesirable for public distribution, keep the internal architecture generic and rename the public package later.

Initial compatibility target:

```text
minimum: 13.351
verified: 13.351
maximum: 13.351
```

Do not claim compatibility with another Foundry build or major version until it has its own integration-test pass. The repository owner is responsible for installing Foundry 13.351; implementation begins only after that runnable build is available.

---

# 7. Data Model

## 7.1 Actor types

Initial Actor types:

```text
survivor
zombie
vehicle
```

Future:

```text
companion
npc
```

## 7.2 Item types

Initial Item types:

```text
weapon
equipment
skill
objective
```

Optional later:

```text
armor
ammo
consumable
mission-rule
spawn-effect
```

Avoid creating distinct Item types when a category field is sufficient.

## 7.3 Cards and Card types

Initial `Cards` stack subtypes:

```text
equipmentDeck
equipmentInPlay
equipmentDiscard
spawnDeck
spawnDiscard
```

Initial embedded `Card` subtypes:

```text
equipment
spawn
```

Register v13 DataModels for these subtypes and declare them in `system.json`. Equipment Card system data includes the validated Item template/snapshot and current Card-to-Item link metadata. Spawn Card system data includes its ruleset-driven danger entries and effect type. Deck order and unrevealed faces remain hidden according to Foundry permissions and the authority workflow.

---

# 8. Survivor Data Model

Suggested conceptual model:

```javascript
{
  identity: {
    archetype: "",
    isKid: false
  },

  wounds: {
    value: 0,
    maxOverride: null
  },

  adrenaline: {
    value: 0
  },

  actions: {
    baseOverride: null
  },

  inventory: {
    backpackCapacity: 5,
    leftHandItemId: null,
    rightHandItemId: null,
    bodyItemId: null
  },

  stats: {
    zombiesKilled: 0,
    objectivesTaken: 0,
    searches: 0
  },

  flags: {}
}
```

Danger Level, maximum Wounds, action allowance, actions remaining, current-turn status, and elimination status are derived values. Do not duplicate them as independently writable Actor fields.

Modern 2E defaults must derive maximum Wounds from the Survivor profile: 3 for an adult and 2 for a kid. Rulesets and missions may override this.

`backpackCapacity` applies only to backpack cards. Hand and Body slots are additional equipped slots and must not be counted as part of the five-card backpack limit.

If the ruleset requires configurable thresholds, store thresholds in the ruleset, not each Actor.

## Survivor derived properties

Expose helpers such as:

```javascript
survivor.currentDangerLevel
survivor.actionsRemaining
survivor.activeSkills
survivor.equippedWeapons
survivor.currentZone
survivor.isEliminated
```

---

# 9. Zombie Data Model

Do not create a unique Actor class for every zombie profile unless necessary.

Use:

```javascript
{
  zombieType: "walker",

  profile: {
    actions: 1,
    damage: 1,
    toughness: 1,
    adrenalineReward: 1,
    targetingPriority: 2
  },

  behavior: {
    canOpenDoors: false,
    specialMovement: null
  }
}
```

Zombie Actors contain reusable profile data only. Do not persist `actionsRemaining` or `activatedThisPhase` on an Actor: multiple unlinked Tokens may share the same base Actor. Activation progress belongs to the authoritative phase transaction and references concrete Token UUIDs or calculated zone/type groups.

The 2nd Edition ruleset should define the standard profiles.

Examples of logical types:

```text
walker
runner
brute
abomination
```

Expansion-specific zombie behavior must be extendable through profile/ruleset code.

---

## 9.1 Vehicle Data Model

Vehicles are required for the Modern 2E v1.0 baseline but are not part of the first playable MVP.

Use a `vehicle` Actor with a placed Token and ruleset-driven profile:

```javascript
{
  vehicleType: "car",
  seats: {
    driver: null,
    passengers: []
  },
  storage: {
    itemIds: [],
    capacity: null
  },
  profile: {
    actions: [],
    movement: {},
    attack: {}
  },
  state: {
    disabled: false
  }
}
```

Vehicle occupants are Survivor UUIDs. Use one linked Vehicle Token per Vehicle Actor so occupancy and persistent vehicle state cannot leak across multiple Tokens. Mission state owns temporary movement/action progress; the Vehicle Actor owns persistent configuration and inventory. Exact car actions and attack behavior are supplied by the Modern 2E ruleset and must be verified before implementation.

---

# 10. Weapon Data Model

Suggested model:

```javascript
{
  category: "melee", // melee | ranged

  dice: 2,
  accuracy: 4,
  damage: 1,

  range: {
    min: 0,
    max: 0
  },

  noise: {
    attack: true,
    door: false
  },

  traits: {
    dual: false,
    silent: false,
    sniper: false,
    doorBreaker: false,
    special: []
  },

  restrictions: {
    dangerLevels: []
  }
}
```

Do not hard-code weapon behavior into UI click handlers.

Attack behavior must be resolved through the combat engine.

---

# 11. Equipment and Skill Data

## Equipment

Generic equipment:

```javascript
{
  category: "consumable",
  slot: "backpack",
  stackable: false,
  quantity: 1,
  effects: []
}
```

## Skill

Skills should use a structured effect model wherever feasible.

Example:

```javascript
{
  trigger: "attack",
  effects: [
    {
      type: "modifyDice",
      mode: "add",
      value: 1,
      condition: {
        attackType: "melee"
      }
    }
  ]
}
```

However, do not attempt to create a universal scripting language during MVP.

Use three tiers:

1. **Declarative effects** for simple modifiers.
2. **Registered handlers** for complex skills.
3. **Manual/GM resolution** for unsupported skills.

Every unsupported skill should still be representable as an Item with descriptive metadata.

---

# 12. Zone System — Core Design

This is one of the most important parts of the project.

A Zombicide board is fundamentally a graph of **Zones**, not a normal RPG movement grid.

Use **Foundry Scene Regions** to represent zones visually and spatially.

Register a Foundry v13 custom `RegionBehavior` subtype named `zombicideZone`, backed by a `RegionBehaviorType` DataModel. Each Region designated as a Zone receives exactly one such behavior. Use flags only for non-schema metadata; do not make an unvalidated flag object the canonical Zone definition.

```javascript
{
  enabled: true,
  zoneId: "zone-001",
  type: "street", // street | room | dark | special
  buildingId: null,
  streetAxis: null, // horizontal | vertical | null
  membershipPriority: 0,
  searchable: false,
  spawnZone: false,
  objectiveZone: false,
  exitZone: false
}
```

Do not use Region names as stable IDs.

Use generated stable IDs/UUID references.

Do not persist Noise on the RegionBehavior. Noise is transient authoritative mission state keyed by `zoneId`.

Every room/dark Zone must have a `buildingId` in the MVP unless a documented special-zone rule explicitly marks it as exempt. Board validation rejects missing assignments and building doors whose interior Zone has no building assignment.

---

# 13. Zone Graph

Maintain a logical zone graph derived from Regions and explicit adjacency configuration.

Example:

```javascript
{
  "zone-001": {
    regionUuid: "...",
    adjacent: [
      {
        zoneId: "zone-002",
        edgeId: "edge-001",
        type: "open"
      }
    ],
    sightLaneIds: []
  }
}
```

Edges should support:

```text
open
door
blocked
one-way
special
```

Conceptual edge:

```javascript
{
  id: "edge-001",
  from: "zone-001",
  to: "zone-002",
  type: "door",
  doorUuid: "...",
  direction: "east",
  open: false, // derived in a graph snapshot from the Wall/Door Document
  blocksMovement: true,
  blocksLineOfSight: true
}
```

Do not calculate adjacency purely by Region geometry. Board art and Region boundaries may not perfectly touch.

The Foundry Wall/Door Document is canonical for visual door state. Do not persist an independently writable `edge.open`; derive it when building the graph snapshot and invalidate the cache when the Wall changes.

Provide a **Zone Editor** allowing the GM to explicitly connect zones.

Movement adjacency and visibility are related but distinct. The Scene graph must also store explicit ordered sight lanes for street LOS and optional GM visibility overrides:

```javascript
{
  sightLanes: {
    "lane-001": {
      axis: "horizontal",
      zoneIds: ["zone-001", "zone-002", "zone-003"]
    }
  },
  visibilityOverrides: [
    { from: "zone-004", to: "zone-006", visible: false }
  ]
}
```

Do not use shortest-path reachability as line of sight.

---

# 14. Zone Editor

Create a GM-only application for configuring the active Scene.

Minimum workflow:

1. GM creates/draws Foundry Regions around board zones.
2. Select a Region.
3. Mark it as a Zombicide Zone.
4. Choose zone type.
5. Connect it to neighboring zones.
6. Associate doors with edges.
7. Assign room/dark Zones to buildings.
8. Configure street sight lanes and any visibility overrides.
9. Flag searchable rooms, spawn zones, objectives, exits, etc.
10. Run board validation.

Provide a board-validation command that checks:

- Regions without zone IDs.
- Duplicate zone IDs.
- Broken adjacency references.
- Doors referencing missing objects.
- Room/dark Zones missing required building IDs.
- Building door edges with inconsistent building assignments.
- Sight lanes containing missing, duplicate, or non-street Zones.
- Street Zones that require LOS but belong to no sight lane.
- Spawn zones without connections.
- Survivors/Tokens outside zones.
- Overlapping zones that cause ambiguous membership.
- Disconnected board components.
- Mission references to nonexistent zones.

---

# 15. Token-to-Zone Membership

Implement:

```javascript
getTokenZone(token)
getTokensInZone(zoneId)
getSurvivorsInZone(zoneId)
getZombiesInZone(zoneId)
```

Use the token center point as the default zone-membership test.

If a token belongs to multiple overlapping Regions:

1. Prefer explicitly prioritized Region if configured.
2. Otherwise flag as ambiguous.
3. Do not silently choose an arbitrary zone during automated zombie resolution.

Update membership on token movement.

Cache membership carefully, but always be able to recompute it from the Scene.

---

# 16. Door System

Doors are graph edges.

Do not make combat/pathfinding depend directly on visual wall geometry.

The Foundry Wall/Door is the visual object; the zone edge is the rules object.

Opening a door should:

1. Validate Survivor action.
2. Validate adjacency.
3. Validate equipment/skill requirement if applicable.
4. Spend the action.
5. Set the Foundry door state.
6. Invalidate/rebuild the derived zone-edge snapshot.
7. Create noise if applicable.
8. Trigger building/dark-zone spawning if the active ruleset/mission requires it.
9. Write a ChatMessage/event.

Provide GM override:

```text
Open without action
Close
Lock
Unlock
Ignore spawn trigger
Force spawn trigger
```

Modern 2E building spawning is stateful. On the first qualifying door opening into a previously unopened building, resolve the verified dark-zone spawn procedure for that building and set its authoritative state to opened/revealed. Closing and reopening a door must not trigger it again unless a mission rule explicitly resets the building.

Conceptual state:

```javascript
buildingState[buildingId] = {
  revealed: true,
  triggeringDoorEdgeId: "edge-001",
  spawnedDarkZoneIds: ["zone-004", "zone-005"]
};
```

Door state changes, building-state changes, spawn draws, and created Tokens belong to one previewed transaction.

---

# 17. Noise Engine

Noise is zone-based.

Store transient noise in game state, not permanently in Token data.

Interface:

```javascript
addNoise(zoneId, amount, source)
removeNoise(zoneId, amount)
clearNoise()
getNoisiestZones()
```

Noise sources can include:

- Weapon attack.
- Door opening.
- Explicit survivor action.
- Skill/equipment effect.
- Mission-specific rule.

The UI should visibly display current noise count per zone.

At End Phase, clear temporary noise according to the ruleset.

---

# 18. Line of Sight

Do not blindly rely on Foundry's normal token vision.

Implement a **Zombicide line-of-sight service** based on zone connectivity and board semantics.

Interface:

```javascript
canSeeZone(observerZoneId, targetZoneId, context)
getVisibleZones(observerZoneId, context)
getVisibleSurvivorsForZombie(zoneId)
```

The implementation should be ruleset-aware. Modern 2E defaults must implement:

- Building LOS only through a valid opening to an adjacent Zone, limited to one Zone.
- Street LOS along a configured straight sight lane until a blocking wall, closed door, or board edge.
- Explicit treatment of transitions between street and building Zones.
- Symmetric visibility unless a special rule or configured override says otherwise.

Foundry Walls may assist but should not be the only source of truth.

For MVP, permit explicit GM configuration when LOS cannot be inferred reliably.

Milestone 3 must deliver this LOS service because ranged combat depends on it. Zombie AI later consumes the same service rather than introducing it.

---

# 19. Game State

Create one authoritative, versioned game-state object for the active mission.

For the initial single-Scene mission architecture:

- Persist canonical mission state in `flags.zombicide.gameState` on the mission Scene.
- Define a dedicated `GameStateModel`/schema used to validate, clean, migrate, and serialize that flag before every read or write; never mutate the raw flag object directly.
- Store only an `activeMissionSceneUuid` pointer in a world Setting.
- Treat Actor, Token, Wall, Cards, and Item Documents as persisted game entities, not duplicate copies inside mission state.
- Never store the only copy in an application instance, chat message, or client-local setting.
- Add a migration for every persisted `schemaVersion` change.

Multi-Scene missions require a later state-owner design and are not part of the MVP.

Conceptual state:

```javascript
{
  schemaVersion: 1,
  revision: 0,
  lastTransactionId: null,
  recentTransactionIds: [],

  missionId: "...",
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
    gameStarted: true,
    gameOver: false
  }
}
```

Game state must survive refresh/reconnect.

Do not persist a global Danger Level. Derive the highest active Survivor Danger Level from current Survivor Actors whenever a spawn calculation begins. A short-lived calculation cache is allowed only with explicit invalidation.

All state mutations use compare-and-swap semantics: a command names the expected `revision`, and a successful commit increments it. Reject stale commands and duplicate transaction IDs. Keep a bounded record of recently applied transaction IDs so a retried socket request is idempotent.

---

# 20. Authority and Multiplayer

Only one active GM client may authoritatively apply gameplay commands. Establish this contract before implementing the Survivor Engine; Milestone 11 hardening verifies and extends it rather than retrofitting it.

Authority model:

- Elect one active GM deterministically from connected active GMs and expose the authority user ID in memory.
- Players submit command requests through the system socket namespace.
- The authority GM validates phase, ownership, permissions, expected state revision, rules, and document preconditions.
- The authority computes a complete change set before applying any Document updates.
- The authority commits Document updates and canonical Scene state, then broadcasts the accepted result.
- If authority disconnects, pause new commands, elect a replacement, reload canonical state, and then resume.
- If no GM is active, automated gameplay pauses with a clear message.

Normal Foundry Document permissions remain part of the boundary, but hidden UI controls are not authorization. Foundry system code is client-side, so document ownership cannot be treated as protection against a deliberately modified client; document this threat-model limitation.

Avoid race conditions such as two clients resolving zombie movement simultaneously. No gameplay service may directly update mission state without going through the command/transaction service.

Engine results should have a transaction/event ID.

Example:

```javascript
{
  transactionId: "...",
  expectedRevision: 12,
  type: "zombieActivation",
  round: 4,
  phase: "zombie",
  changes: [...]
}
```

For multi-document operations, first calculate and validate the complete result. Apply batched updates where possible. If a commit fails partway, pause automation, report the partial transaction, and provide a GM reconciliation workflow; do not continue dependent calculations.

---

# 21. Survivor Turn Engine

A Player Phase contains ordered player turns, and each player turn contains ordered Survivor activations.

Modern 2E default flow:

1. The user holding the First Player token becomes the active player.
2. That player activates every Survivor assigned to them, one at a time, in any order they choose.
3. Each assigned Survivor may activate exactly once unless a verified rule explicitly changes this.
4. When all of that player's Survivors are activated, play passes to the next user in `playerOrder`.
5. After every player has completed their turn, the Player Phase ends.
6. During End Phase, the First Player token passes to the next user.

GM reassignment and shared-control overrides are allowed, but they must update the authoritative player/Survivor mapping explicitly. Do not infer turn order solely from Actor ownership.

A Survivor activation should have explicit state.

Possible state machine:

```text
READY
  ↓
ACTIVE
  ├─ Move
  ├─ Search
  ├─ Door
  ├─ Reorganize/Trade
  ├─ Melee
  ├─ Ranged
  ├─ Objective
  ├─ Special
  ↓
ENDED
```

Actions are not just UI buttons.

Define a common action interface:

```javascript
{
  id: "move",
  label: "Move",
  validate(context) {},
  getCost(context) {},
  execute(context) {}
}
```

Every action should:

1. Validate.
2. Calculate cost.
3. Preview consequences when appropriate.
4. Execute transaction.
5. Write game event/chat output.
6. Update UI.

---

# 22. Action Economy

Implement:

```javascript
getBaseActions(survivor)
getBonusActions(survivor, context)
getActionCost(action, survivor, context)
canAffordAction(...)
spendActions(...)
refundActions(...)
```

Do not directly decrement `system.actions` throughout unrelated code.

All action spending should go through one action service.

Support action-specific bonuses such as:

```text
+1 Move Action
+1 Melee Action
+1 Ranged Action
+1 Search Action
```

The action engine should distinguish general and restricted bonus actions.

Spent actions and restricted bonus-action consumption are stored in authoritative mission turn state, keyed by Survivor UUID. They are not persisted on the Survivor Actor. A refund is allowed only through an explicit compensating command associated with the original transaction.

---

# 23. Movement

Survivor movement should be zone-based.

When a player attempts to move:

1. Determine current zone.
2. Determine destination zone.
3. Verify adjacency.
4. Verify edge/door state.
5. Check zombies in current zone.
6. Apply additional action costs/restrictions if the rules require them.
7. Spend actions.
8. Move token to configured destination/anchor in target Region.
9. Trigger Region/mission events.

For MVP, require the player to click a destination zone or use a Move dialog.

Later, add drag validation.

---

# 24. Search

Search should be a first-class action.

Flow:

```text
SEARCH
  ↓
Validate location
  ↓
Validate once-per-turn or relevant restriction
  ↓
Spend action
  ↓
Draw equipment card
  ↓
Resolve immediate card effects
  ↓
Place item in inventory / prompt discard
  ↓
Log result
```

Deck implementation should use Foundry's current supported Cards/Deck API if appropriate.

Do not encode copyrighted official card contents in the repository.

Ship a small **generic test deck** such as:

```text
Test Pistol
Test Blade
Test Food
Test Tool
```

This is only for development/testing.

## Equipment Card and Item Lifecycle

Define the physical card lifecycle explicitly:

- Use one Foundry `Cards` deck for Equipment, one in-play `Cards` stack, and one discard `Cards` pile for the active mission.
- A Card stores validated Item template data or a stable Item template UUID plus the minimum snapshot needed to survive a missing optional compendium.
- On a normal draw, the authority moves the Card from the deck to the in-play stack and creates one embedded Item on the receiving Survivor.
- Link both representations with `sourceCardUuid`, `holderActorUuid`, and `embeddedItemUuid` metadata.
- Trading transfers the embedded Item and updates the Card link in the same transaction.
- Discarding or consuming card-backed equipment deletes the embedded Item and moves the source Card to the discard pile in the same transaction.
- Immediate cards resolve without creating an inventory Item unless their effect says otherwise.
- Reshuffle only when the active ruleset says to; move discard Cards back to the deck and shuffle through the authority service.
- Items created manually without a source Card are legal custom content and have `sourceCardUuid: null`.

Authority validation must prevent one Card from materializing as multiple Items. Add a reconciliation command that reports and repairs missing/orphaned links without silently duplicating or deleting player-visible equipment.

Hidden Card faces and deck order must not be exposed to players by system chat, socket payloads, debug logs, or application context before the draw is committed.

---

# 25. Inventory

Survivor sheet should show:

```text
LEFT HAND
RIGHT HAND
BODY
BACKPACK
```

depending on what the edition/ruleset supports.

Support:

- Equip.
- Unequip.
- Move between slots.
- Trade.
- Discard.
- Give.
- Receive.
- Quantity if needed.
- Capacity validation.

Drag-and-drop is desirable but not mandatory for the first functional milestone.

All inventory changes must respect Actor ownership and multiplayer authority.

---

# 26. Adrenaline and Danger Level

Centralize adrenaline updates:

```javascript
gainAdrenaline(survivor, amount, source)
setAdrenaline(survivor, value)
getDangerLevel(adrenaline, ruleset)
```

When a Survivor crosses a danger threshold:

1. Update derived danger level.
2. Detect newly available skills.
3. Prompt for a skill choice if required.
4. Update global highest danger level.
5. Notify chat/dashboard.

The **highest active Survivor danger level** must be easy for the spawn engine to query.

Do not manually maintain this in several places.

---

# 27. Skill Unlock System

Represent skill progression separately from the skill Items themselves.

Concept:

```javascript
{
  blue: ["skill-uuid-a"],
  yellow: ["choice-group-yellow"],
  orange: ["choice-group-orange"],
  red: ["choice-group-red"]
}
```

A choice group:

```javascript
{
  id: "choice-group-orange",
  choose: 1,
  options: [
    "skill-uuid-x",
    "skill-uuid-y"
  ]
}
```

Once chosen, persist the choice on the Survivor.

Provide GM override for mistakes.

---

# 28. Combat Engine

Combat must be deterministic, testable, and independent of sheet code.

Primary API:

```javascript
prepareAttack(context)
validateAttack(context)
rollAttack(context)
resolveHits(context, roll)
resolveFriendlyFire(context, roll)
applyAttackResolution(resolution)
```

Context should include:

```javascript
{
  attackerUuid,
  weaponUuid,
  targetZoneId,
  attackType,
  selectedTargets,
  modifiers,
  rulesetId
}
```

---

# 29. Dice Resolution

Use Foundry Roll API for visible/random rolls, but keep threshold/hit calculation isolated.

Concept:

```javascript
{
  dice: 3,
  accuracy: 4,
  damage: 1
}
```

Result:

```javascript
{
  rolls: [2, 4, 6],
  hits: 2,
  misses: 1
}
```

Apply modifiers before the final roll definition.

Enforce ruleset minimum/maximum accuracy where applicable.

---

# 30. Targeting Priority

Target priority must be ruleset-defined.

Do not scatter numeric priority values throughout code.

Example interface:

```javascript
ruleset.targeting.getPriority(zombie)
ruleset.targeting.sortTargets(zombies, context)
```

The 2nd Edition implementation should match the official target-priority rules.

Combat should support:

- Auto-assign hits according to priority.
- Optional preview before damage.
- GM override.
- Skills that alter target selection.

---

# 31. Friendly Fire

Implement as a separate resolver because ranged misses and Survivor presence may require special handling.

Interface:

```javascript
resolveFriendlyFire({
  attacker,
  targetZone,
  misses,
  survivorsInZone,
  weapon,
  modifiers
})
```

Never hide friendly-fire resolution.

Display it clearly in the chat card and allow GM correction when a rare rule interaction is unsupported.

---

# 32. Zombie Activation Engine

Zombie phase should operate on **groups by zone/type** when possible rather than issuing hundreds of tiny Foundry operations.

Suggested pass-based algorithm:

```text
FOR action pass from 1 to maximum actions in this activation:
    eligibleGroups = all groups whose profile grants this action pass
    snapshot the authoritative board state at the start of the pass
    FOR each eligible group in deterministic board order:
        IF survivors are in the same zone:
            preview attacks
        ELSE:
            determine target
            determine route(s)
            preview movement
    resolve required player choices
    apply the complete pass transaction
    rebuild groups and re-evaluate the board before the next pass
```

Batch Token updates.

Use rules-engine results first, then animate/apply Foundry Token movement.

---

# 33. Zombie Attack

When Zombies share a zone with Survivors:

1. Determine number/type of attacks.
2. Calculate total wounds/damage.
3. Prompt assignment if players must decide distribution.
4. Apply wounds.
5. Detect elimination.
6. Check defeat conditions.
7. Consume the zombie action.
8. Log event.

Do not assume the engine can always choose which Survivor receives wounds.

When player choice exists, pause automation and prompt.

---

# 34. Zombie Target Selection

Target selection should be a pure function where possible.

Conceptual decision:

```javascript
chooseZombieTarget({
  zombieZone,
  visibleSurvivors,
  survivorZones,
  noiseByZone,
  zoneGraph,
  ruleset
})
```

Return:

```javascript
{
  targetZoneIds: [...],
  reason: "visible" | "noise",
  candidateRoutes: [...]
}
```

Do not immediately move tokens during target calculation.

This makes the process debuggable.

---

# 35. Pathfinding

Represent the board as a graph and use a shortest-path algorithm such as BFS for unweighted zone movement.

Interface:

```javascript
findShortestPaths(graph, startZoneId, targetZoneId, options)
```

Options should allow:

```javascript
{
  canTraverseEdge,
  maxDepth,
  movementType
}
```

Return **all equally short valid paths** when required because route splitting/tie behavior may depend on equal paths.

Do not return only the first BFS path.

---

# 36. Split Routes

Zombicide route splitting is a rules-heavy area.

Implement split handling as its own service:

```javascript
resolveSplitMovement({
  zombieGroups,
  equalRoutes,
  availableMiniatures,
  ruleset
})
```

Requirements:

- Unit tests for ties.
- Unit tests for insufficient miniatures only for rulesets that add miniatures during splitting; Modern 2E uneven groups assign the extra existing Zombie by player choice instead.
- Preview in GM debug mode.
- Manual override button.

Do not bury split handling inside pathfinding.

---

# 37. Runner / Multi-Action Zombies

Zombie Actors must expose actions per activation, but the activation engine schedules global action passes rather than exhausting one group's actions at a time.

Modern 2E ordering:

1. All Zombies, including Runners, resolve their first Action.
2. After the complete first pass is applied, all Runners resolve their second Action.
3. Extra-action profiles use additional global passes defined by their ruleset.

Re-evaluate conditions and rebuild zone/type groups before each global pass.

A zombie may move on one action and attack on a later action if it reaches Survivors.

Do not calculate the entire multi-action activation from the initial board state.

---

# 38. Zombie Spawn Engine

The spawn engine should be driven by **data**, not card-specific `if` statements.

Spawn card conceptual structure:

```javascript
{
  id: "spawn-test-001",
  type: "normal",
  entries: {
    blue: {
      zombieType: "walker",
      count: 2
    },
    yellow: {
      zombieType: "walker",
      count: 3
    },
    orange: {
      zombieType: "runner",
      count: 2
    },
    red: {
      zombieType: "brute",
      count: 2
    }
  }
}
```

Other card effect types:

```text
normal
rush
extraActivation
abomination
special
```

Keep these extensible.

Use a Foundry `Cards` deck and discard pile for spawn cards. A spawn draw moves exactly one Card to discard, resolves the selected danger entry, and records the Card UUID in the transaction. When the deck is empty, the authority moves the discard pile back, shuffles it, and continues according to the Modern 2E rules. A retried transaction must not draw a second Card.

---

# 39. Spawn Resolution

Flow:

```text
Spawn Zone
   ↓
Draw Spawn Card
   ↓
Determine highest Survivor Danger Level
   ↓
Select card entry for that level
   ↓
Resolve special effect
   ↓
Spawn / activate Zombies
   ↓
Log event
```

Spawn ordering must be explicit and mission/ruleset-aware.

Provide a Spawn Manager dashboard showing:

- Spawn zones.
- Current spawn order.
- Card drawn.
- Danger level used.
- Result.
- Remaining finite zombie pool and any shortage consequence.

---

# 40. Zombie Pool

Modern 2E requires a finite physical miniature pool by default:

```javascript
ruleset.settings.enforceFiniteZombiePool = true
```

State:

```javascript
{
  walker: {
    total: 40,
    available: 28,
    inPlay: 12
  }
}
```

Enforce the invariant `total = available + inPlay` for each finite type.

When a spawn requests more miniatures than remain, place all remaining miniatures and immediately give every Zombie of the requested type an extra Activation, including any chained consequences required by subsequent shortages. This behavior is required in the Modern 2E MVP and must have automated tests.

An unlimited digital-token pool is an explicit house-rule setting, off by default, and must be visible in the dashboard and event log.

---

# 41. Phase State Machine

Use an explicit mission phase machine.

```text
SETUP
  ↓
SURVIVOR_PHASE
  ↓
ZOMBIE_PHASE
  ↓
END_PHASE
  ↓
SURVIVOR_PHASE
  ...
  ↓
VICTORY / DEFEAT
```

Do not let phase transitions be arbitrary flags scattered through UI code.

Interface:

```javascript
startGame()
beginSurvivorPhase()
beginPlayerTurn(userUuid)
activateSurvivor(uuid)
endSurvivorTurn(uuid)
endPlayerTurn(userUuid)
endSurvivorPhase()
beginZombiePhase()
resolveZombiePhase()
beginEndPhase()
resolveEndPhase()
startNextRound()
rotateFirstPlayer()
endGame(result)
```

Every transition validates its expected previous state.

---

# 42. Survivor Phase

Dashboard should show all Survivors:

```text
ROUND 4 — SURVIVOR PHASE

[FIRST] Player One
  [✓] Survivor A
  [▶] Survivor B — 2 actions remaining

[NEXT] Player Two
  [ ] Survivor C
  [ ] Survivor D
```

Rules:

- Follow First Player and clockwise player order by default.
- Within the active player's turn, support player-selected order among their assigned Survivors.
- A Survivor cannot unintentionally activate twice.
- GM can reset/reopen a turn.
- GM can force-end a Survivor.
- End Survivor Phase only after valid completion or GM override.

---

# 43. Zombie Phase

Provide two automation modes.

## Assisted

The system:

- Calculates attacks.
- Calculates targets.
- Calculates movement.
- Calculates spawns.

But pauses before applying major steps.

## Automatic

The system resolves the entire phase until:

- Player choice is required.
- An unsupported rule is encountered.
- Mission logic requests a pause.
- GM presses pause.

Store a world setting:

```text
Zombie Automation:
- Manual
- Assisted
- Automatic
```

Default to **Assisted** during development.

---

# 44. End Phase

End Phase should be explicit and configurable.

Typical responsibilities:

- Clear temporary noise.
- Reset per-round markers.
- Reset Survivor activation status.
- Reset per-turn search/action flags.
- Apply mission rules specifically triggered by End Phase.
- Increment round.
- Pass the First Player token to the next user in player order.
- Start next Survivor Phase.

Do not make cleanup dependent on the dashboard remaining open.

Victory and defeat are not normally delayed until End Phase. For each command, evaluate affected mission conditions against the projected final state and its event batch before commit; include a terminal result in the same transaction. Modern 2E defaults to immediate victory when all required Mission objectives are accomplished and immediate defeat when any Survivor is eliminated, when objectives can no longer be fulfilled, or when a mission-specific losing condition occurs.

---

# 45. Mission Model

Missions should be data-driven.

Concept:

```javascript
{
  id: "test-mission-01",
  name: "Test Mission",

  sceneUuid: "...",

  survivorRules: {
    min: 1,
    max: 6
  },

  spawnZones: [
    "zone-spawn-a",
    "zone-spawn-b"
  ],

  objectives: [
    {
      id: "obj-a",
      type: "collect",
      zoneId: "zone-004",
      required: true
    }
  ],

  victoryCondition: {
    all: [
      { type: "allObjectivesComplete" },
      {
        type: "allLivingSurvivorsInZone",
        zoneId: "zone-exit"
      }
    ]
  },

  defeatCondition: {
    any: [
      { type: "anySurvivorEliminated" },
      { type: "objectivesImpossible" }
    ]
  },

  specialRules: []
}
```

Condition expressions support explicit `all`, `any`, and `not` groups. Never rely on an undocumented assumption about whether an array means AND or OR. The Modern 2E ruleset supplies the default immediate-defeat conditions; a mission may add or explicitly override them through a clearly labeled variant.

---

# 46. Objective Engine

Support generic objective primitives first:

```text
collectObjective
reachZone
surviveRounds
killZombieType
killCount
openDoor
escortActor
allSurvivorsReachZone
custom
```

Each objective exposes:

```javascript
isComplete(state)
getProgress(state)
onGameEvent(event, state)
```

Mission logic should consume game events rather than polling everything unnecessarily.

---

# 47. Game Event Bus

Create a normalized event model.

Examples:

```text
survivorMoved
survivorSearched
doorOpened
weaponFired
zombieKilled
survivorWounded
survivorEliminated
objectiveTaken
zombiesSpawned
zombiesActivated
phaseChanged
roundStarted
```

Concept:

```javascript
{
  id: "...",
  type: "zombieKilled",
  timestamp: 0,
  round: 3,
  phase: "survivor",
  actorUuid: "...",
  sourceUuid: "...",
  zoneId: "...",
  data: {}
}
```

The event bus can drive:

- Mission objectives.
- Statistics.
- Chat messages.
- Sound/VFX hooks.
- Debugging.
- Undo history later.

---

# 48. Chat Cards

Important actions should produce readable chat cards.

Example:

```text
WANDA — RANGED ATTACK
Weapon: Test Pistol
Target Zone: Street 05

Dice: 4, 5, 1
Hits: 2
Misses: 1

Killed:
2 Walkers

Adrenaline: +2
```

Zombie events:

```text
ZOMBIE ACTIVATION
Zone 08

2 Walkers moved to Zone 05
Target: Survivor B
Reason: Visible Survivor
```

Avoid flooding chat for every internal calculation.

Provide configurable chat verbosity:

```text
Minimal
Normal
Debug
```

---

# 49. Survivor Sheet

Initial sheet layout:

```text
┌──────────────────────────────────────────┐
│ Survivor                                 │
│ Adrenaline / Danger                      │
│ Wounds                                   │
│ Actions Remaining                        │
├──────────────────────────────────────────┤
│ ACTIONS                                  │
│ Move Search Door Trade Objective         │
│ Melee Ranged End Turn                    │
├──────────────────────────────────────────┤
│ HANDS / BODY                             │
│ Left | Right | Body                      │
├──────────────────────────────────────────┤
│ BACKPACK                                 │
├──────────────────────────────────────────┤
│ SKILLS                                   │
├──────────────────────────────────────────┤
│ STATS / STATUS                           │
└──────────────────────────────────────────┘
```

Prioritize function over visual polish.

---

# 50. Game Dashboard

Create a GM/player dashboard available from Scene controls or a system button.

Minimum:

```text
MISSION
ROUND
PHASE
HIGHEST DANGER LEVEL

SURVIVORS
- name
- danger
- wounds
- actions
- activated

NOISE
- zone rankings

SPAWN ZONES
- order
- enabled/disabled

CONTROLS
- Start Mission
- Begin/End Phase
- Pause Automation
- Resolve Zombie Step
- Resolve Spawn Step
- Undo Last Safe Action (future)
```

GM controls must be visually distinguished.

---

# 51. Token HUD

Add useful context controls if current Foundry APIs permit cleanly:

Survivor:

```text
Activate
Move
Attack
End Turn
```

Zombie:

```text
Activate Group
Move Group
Kill
```

Do not overload the HUD in MVP.

---

# 52. Localization

Implement localization from the beginning.

Files:

```text
lang/en.json
lang/es.json
```

All user-visible strings should be localized.

Spanish support should be complete enough for normal gameplay before calling v1.0 stable.

Do not use copyrighted localized rulebook text.

---

# 53. Ruleset Abstraction

Create a base ruleset interface.

Concept:

```javascript
class BaseRuleset {
  get id() {}
  get dangerLevels() {}
  get zombieProfiles() {}
  get targetingRules() {}
  get phaseRules() {}
  get spawnRules() {}
  get movementRules() {}
  get combatRules() {}
}
```

Modern 2E:

```javascript
class Modern2ERuleset extends BaseRuleset {
  // overrides
}
```

Game engine code should ask the active ruleset for decisions/parameters.

Bad:

```javascript
if (zombie.type === "runner") ...
```

Better:

```javascript
const actions = ruleset.getZombieActions(zombie, context);
```

This makes later editions practical.

---

# 54. Rules That Must Be Parameterized

At minimum:

- Danger thresholds.
- Base Survivor actions.
- Wound capacity.
- Player/First Player turn order.
- Zombie profiles.
- Zombie global action-pass scheduling.
- Target priority.
- Search restrictions.
- Door rules.
- Building spawn behavior.
- Friendly fire.
- Accuracy limits.
- Spawn order.
- Runner actions.
- Noise behavior.
- Split rules.
- Zombie pool behavior.
- Default immediate victory/defeat conditions and evaluation timing.
- Skill progression.
- Objective adrenaline rewards.
- Mission victory/defeat rules.
- Vehicle/car actions and occupancy.

---

# 55. Content Strategy

The repository should contain **only generic placeholder content** required to test the system.

Example generic test content:

Survivors:

```text
Test Survivor Alpha
Test Survivor Bravo
```

Weapons:

```text
Test Pistol
Test Blade
Test Shotgun
```

Zombies:

```text
Test Walker
Test Runner
Test Brute
Test Abomination
```

Cards:

```text
Test Spawn 001
Test Spawn 002
```

Mission:

```text
Developer Test Mission
```

Users can create/import their own legally obtained content.

---

# 56. Import/Export

Later milestone:

Allow JSON import/export of custom definitions.

Examples:

```text
survivors.json
weapons.json
skills.json
spawn-deck.json
mission.json
```

Validate imported data against schemas.

Never implement a tool intended to scrape official sites/PDFs or redistribute protected assets.

---

# 57. Logging and Debug Mode

Create system logging utility.

Levels:

```text
error
warn
info
debug
trace
```

Debug mode should optionally visualize:

- Zone IDs.
- Zone graph edges.
- Current token zone.
- Visible target zones.
- Noise values.
- Candidate zombie targets.
- Candidate shortest paths.
- Selected path.
- Split result.
- Spawn card resolution.
- Current state machine state.

This is extremely valuable for zombie AI debugging.

---

# 58. Error Handling

Automation must fail safely.

If the engine cannot resolve something:

```text
AUTOMATION PAUSED

Reason:
Zombie group in Zone 07 has two equally valid interpretations
because Zone 09 has ambiguous membership.

[Open Zone Debugger]
[Resolve Manually]
[Retry]
```

Do not partially apply a phase if remaining calculations depend on an unresolved state.

Use transactional/batched changes where practical.

---

# 59. Undo Strategy

Do not attempt unrestricted full-world undo in MVP.

Instead, design game events so a limited undo can be added.

Initial safe undo candidates:

- Adrenaline change.
- Action spending.
- Noise placement.
- Simple movement.
- Equipment transfer.

Dangerous undo:

- Complex spawn phase.
- Multi-step zombie activation.
- Deck draws after players have seen hidden information.

Mark event types with:

```javascript
undoable: true | false
```

---

# 60. Testing Strategy

The majority of tests should target pure engine code.

## Zone graph tests

Test:

- Adjacent zones.
- Closed doors.
- Open doors.
- Disconnected zones.
- One-way edges.
- Multiple equal shortest paths.
- Cycles.
- Building assignment validation.
- First door reveals/spawns a building once.
- Room LOS limited to the verified adjacent opening rule.
- Straight street sight lanes and blockers.
- Street/building LOS transitions.

## Combat tests

Test:

- Hit threshold.
- Multiple hits.
- Damage threshold.
- Target priority.
- Friendly fire.
- No valid targets.
- Skill modifiers.
- Accuracy floor/ceiling where applicable.

## Zombie AI tests

Test:

- Survivor in same zone.
- Visible Survivor.
- No visible Survivor.
- Noise selection.
- Equal-noise tie.
- Shortest path.
- Equal shortest paths.
- Route split.
- Closed door.
- All Zombies complete first Actions before any Runner second Action.
- Re-evaluation after movement.

## Spawn tests

Test:

- Danger-level lookup.
- Normal spawn.
- Rush.
- Extra activation.
- Abomination/special result.
- Empty pool.
- Partial placement followed by the required type-wide extra Activation.
- Chained finite-pool shortages.
- Multiple spawn zones.
- Spawn order.
- Deck exhaustion, discard reshuffle, and duplicate transaction retry.

## Turn tests

Test:

- Valid phase transitions.
- Invalid phase transitions.
- Survivor double activation prevention.
- Active-player ownership and Survivor assignment validation.
- First Player rotation.
- Stale revision and duplicate command rejection.
- End-round reset.
- Victory interrupt.
- Defeat interrupt.

## Mission tests

Test:

- Objective completion.
- Multi-condition victory.
- Immediate defeat when any Survivor is eliminated under Modern 2E defaults.
- Objectives-impossible defeat.
- Event-driven progress.

## Card lifecycle tests

Test:

- One Equipment Card creates exactly one embedded Item.
- Trade updates the Card/Item holder atomically.
- Discard removes the Item and moves the Card to discard.
- Immediate-effect Card creates no unintended Item.
- Retried draw is idempotent.
- Reconciliation detects orphaned and duplicated links.
- Hidden deck order is absent from player-visible payloads.

---

# 61. Foundry Integration Tests

Manual/integration checklist:

- Create world with system.
- Create Survivor.
- Create Zombie.
- Create weapon.
- Drag Item to Survivor.
- Place Actor Token.
- Draw Region.
- Configure Region as Zone.
- Connect two zones.
- Configure a building and street sight lane.
- Verify room, street, and closed/open-door LOS.
- Move Survivor between zones.
- Open door.
- Search.
- Verify the drawn Equipment Card and embedded Item remain linked after refresh, trade, and discard.
- Attack.
- Kill zombie.
- Gain adrenaline.
- Cross danger level.
- Run Survivor Phase.
- Verify active-player order and First Player rotation.
- Run Zombie Phase.
- Verify every Zombie resolves its first Action before Runner second Actions.
- Spawn.
- Exhaust a finite Zombie pool and verify the required extra Activation.
- Refresh browser.
- Verify state persisted.
- Connect second browser/player.
- Verify permissions.
- Verify no duplicate zombie resolution.
- Disconnect the authority GM and verify pause/re-election/recovery.
- Before v1.0, run the generic car integration scenario.

---

# 62. Performance Requirements

A realistic board may contain many Zombie Tokens.

Avoid:

- One database update per Zombie if batching is possible.
- Rebuilding the entire graph for every token.
- Repeated expensive Region geometry checks.
- Excessive chat messages.
- Excessive socket traffic.

Use:

- Zombie groups by zone/type.
- Batched `TokenDocument` updates.
- Cached zone graph with invalidation.
- Cached token-zone membership with movement invalidation.
- Pure calculations before applying updates.

Test with at least:

```text
6 Survivors
100 Zombies
30+ Zones
Multiple spawn zones
```

The UI should remain responsive during a full zombie phase.

The 100-Zombie stress test may enable the explicit unlimited-pool house rule or use expanded generic pool totals. Do not change the Modern 2E gameplay default merely to satisfy the stress fixture.

---

# 63. Security and Permissions

Players must not be able to:

- Modify mission state arbitrarily.
- Trigger GM-only spawn controls.
- Resolve zombie phase twice.
- Edit hidden spawn deck data without permission.
- Change other players' Survivor inventories without allowed rules/actions.
- Invoke system sockets to perform unauthorized updates.

Validate gameplay permission on the authority GM before committing commands, and rely on Foundry's server for its normal Document-permission enforcement. Do not describe client-side rules validation as trusted server execution, and do not rely only on hiding buttons.

---

# 64. Accessibility and UX

At minimum:

- Buttons have text/tooltips.
- Do not rely only on color for Danger Level/status.
- Keyboard-focusable dialogs where practical.
- Clear validation errors.
- Confirmation for destructive GM operations.
- Action remaining count always visible during active turn.

---

# 65. Visual Design

Initial aesthetic can be simple and original.

Do not copy commercial Zombicide card/sheet artwork.

Use:

- Neutral dark/light panels.
- Strong danger indicators.
- Large action buttons.
- Clear wound/adrenaline tracks.
- Original icons or Foundry-provided icons where licensing permits.

Visual polish is lower priority than rules correctness.

---

# 66. Milestone Plan

## Milestone 0 — Bootstrap

Deliver:

- Valid Foundry system.
- World launches.
- `system.json`.
- Main module initialization.
- Localization.
- Settings.
- Basic CSS.
- README.
- Implementation status file.
- Foundry 13.351 recorded as the exact verified build.
- Unit-test command for pure engine modules.

Acceptance:

- Foundry recognizes and loads the system without console errors.
- Test command runs successfully in a clean checkout.

---

## Milestone 1 — Core Documents

Deliver:

- Survivor Actor.
- Zombie Actor.
- Minimal Vehicle Actor schema without car automation.
- Weapon Item.
- Equipment Item.
- Skill Item.
- Equipment/Spawn Card and Cards-stack DataModels without draw automation.
- DataModels.
- Basic sheets.
- Drag/drop Items onto Survivor.
- Versioned Scene game-state schema and migration registry.
- Transaction/command service skeleton with revision and idempotency checks.
- System socket namespace and deterministic active-GM election.

Acceptance:

- Documents persist correctly across reload.
- Invalid data is rejected/coerced appropriately.
- No gameplay automation required yet.
- Refresh preserves canonical Scene state.
- Duplicate or stale test commands are rejected without mutation.

---

## Milestone 2 — Survivor Engine

Deliver:

- Actions.
- Action tracking.
- Inventory.
- Equip/unequip.
- Adrenaline.
- Danger Level.
- Wounds.
- End Turn.
- Player order, First Player ownership, and Survivor-to-player assignments.
- Player command requests validated and committed by the authority GM.

Acceptance:

- A player can play a Survivor turn manually with bookkeeping automated.
- Actions cannot be duplicated by replaying a socket request.
- A player activates only assigned Survivors, once each, before play passes to the next player.

---

## Milestone 3 — Zone Engine

Deliver:

- Region-based zones.
- Typed `zombicideZone` RegionBehavior DataModel.
- Zone editor.
- Zone membership.
- Zone graph.
- Explicit adjacency.
- Door edges.
- Building IDs, first-open detection, and authoritative reveal state. Actual dark-zone Card draws integrate in Milestone 7.
- Street sight lanes and visibility overrides.
- Modern 2E LOS service.
- Noise.
- Debug overlay.

Acceptance:

- System correctly identifies the zone of every test Token.
- Graph path tests pass.
- Doors change path availability.
- LOS tests pass for rooms, streets, doors, blockers, and street/building transitions.
- Opening a second door into an already revealed building does not emit another building-reveal trigger.

---

## Milestone 4 — Combat

Deliver:

- Melee.
- Ranged.
- Dice.
- Range.
- Accuracy.
- Damage.
- Zombie target priority.
- Friendly fire.
- Zombie kill/adrenaline integration.
- Chat cards.

Acceptance:

- Test Survivor can attack and eliminate test Zombies according to configured rules.
- Ranged attacks reject targets outside Modern 2E LOS.

---

## Milestone 5 — Survivor Phase

Deliver:

- Phase state.
- Player turn order and Survivor activation selection within the active player's turn.
- Turn dashboard.
- Search.
- Equipment deck/in-play/discard lifecycle and Card-to-Item reconciliation.
- Door action.
- Movement action.
- Trade/reorganize basics.
- Objective action.
- Minimal mission schema, condition-expression evaluator, and Developer Test Mission.
- Immediate Modern 2E victory/defeat evaluation.

Acceptance:

- Complete Survivor Phase can be played without manual action-count bookkeeping.
- Equipment draws survive refresh without duplicate or orphaned Items.
- The Developer Test Mission can enter immediate victory or defeat from a committed event.

---

## Milestone 6 — Zombie AI

Deliver:

- Zombie grouping.
- Attack.
- Target selection.
- Consumption of the Zone Engine LOS service.
- Noise targeting.
- BFS pathfinding.
- Equal routes.
- Split handler.
- Runner/multi-action handling.
- Global action-pass scheduling: all first Actions before any Runner second Action.
- Assisted zombie phase.

Acceptance:

- Automated test boards resolve zombie movement consistently.
- GM can preview/override.

---

## Milestone 7 — Spawn Engine

Deliver:

- Generic spawn deck.
- Highest-danger lookup.
- Spawn zones.
- Spawn order.
- Normal spawn.
- Rush.
- Extra activation.
- Special handlers.
- Building dark-zone spawn integration driven by Milestone 3 reveal triggers.
- Zombie pool.
- Mandatory finite-pool shortage extra activations and chain handling.
- Spawn deck discard/reshuffle lifecycle.
- Spawn dashboard.

Acceptance:

- Full Zombie Phase including spawning can run in Assisted mode.
- Retrying a spawn transaction cannot draw another Card.
- Finite-pool shortage tests match Modern 2E behavior.

---

## Milestone 8 — End Phase and Full Loop

Deliver:

- End Phase.
- Noise cleanup.
- Round increment.
- Reset state.
- First Player rotation.
- Event-driven immediate victory/defeat checks.
- Game start/end.

Acceptance:

- Developer Test Mission can be played through several complete rounds.

---

## Milestone 9 — Mission Engine Expansion

Deliver:

- Mission dashboard.
- Additional objective primitives.
- Nested condition authoring and validation.
- Special-rule hook system.
- Mission import/export validation.

Acceptance:

- A second generic test mission can be defined without custom engine code.

---

## Milestone 10 — Vehicles and Cars

Deliver:

- Vehicle Actor sheet and Token workflow.
- Driver/passenger occupancy.
- Enter/exit/switch-seat actions.
- Verified Modern 2E car movement and attack actions.
- Vehicle storage/search behavior needed by the base rules.
- Mission hooks and GM overrides.

Acceptance:

- A generic car test scenario completes all supported Modern 2E vehicle actions.
- Occupancy, movement, attacks, inventory, refresh, and multiplayer authority remain consistent.

---

## Milestone 11 — Multiplayer Hardening

Deliver:

- Audit and harden the authority/command foundation introduced in Milestone 1.
- Adversarial socket/permission validation.
- Concurrent player action-request tests.
- Authority disconnect/re-election recovery.
- Refresh/reconnect testing.

Acceptance:

- Two or more clients cannot cause duplicate phase/spawn resolution.

---

## Milestone 12 — UX and Localization

Deliver:

- Improved sheets.
- Spanish translation.
- Better HUD.
- Clear danger/adrenaline presentation.
- Tooltips.
- Error dialogs.
- Settings.

Acceptance:

- Full game usable in English and Spanish with placeholder content.

---

## Milestone 13 — Packaging

Deliver:

- Release build.
- Manifest.
- Changelog.
- Installation instructions.
- User guide.
- GM board-setup guide.
- Content-import documentation.
- Licensing notice.
- Clean repository.

Acceptance:

- Fresh Foundry install can install/load the packaged system according to documented procedure.

---

# 67. MVP Definition

The first **playable MVP** is complete when:

1. The verified Foundry 13.351 build loads the system.
2. GM can create Survivors and Zombies.
3. Survivor sheets track wounds, adrenaline, danger, actions, skills, and inventory.
4. Board Zones can be configured with Regions.
5. Adjacent Zones, buildings, Doors, and Modern 2E LOS work.
6. Survivor movement is zone-based.
7. Noise works.
8. Melee/ranged attacks work.
9. Zombie kills grant adrenaline.
10. Search draws generic equipment.
11. First Player rotation, player turns, and Survivor Phase state work.
12. Zombie target selection works.
13. Zombie pathfinding works.
14. Zombie attack/movement works.
15. Runner multi-action behavior uses global action-pass ordering.
16. Generic spawning, deck reshuffling, and finite-pool shortage consequences work.
17. Highest Survivor Danger Level drives spawns.
18. End Phase cleans/reset state.
19. Mission declares immediate Modern 2E victory/defeat at the correct event boundary.
20. State persists across reload.
21. Multiplayer does not duplicate automation.
22. No proprietary Zombicide assets are required.
23. The MVP Developer Test Mission does not require cars; car support is a v1.0 requirement.

---

# 68. Recommended Development Order

Codex should **not** start with zombie AI.

Recommended order:

```text
Foundry bootstrap
    ↓
DataModels / migrations
    ↓
Canonical state / authority command foundation
    ↓
Sheets/Documents
    ↓
Survivor action and player-turn engine
    ↓
Zone graph / buildings / LOS
    ↓
Combat
    ↓
Cards / Search / minimal mission conditions
    ↓
Zombie target selection
    ↓
Pathfinding
    ↓
Zombie activation
    ↓
Spawn engine
    ↓
Full loop / mission engine expansion
    ↓
Vehicles / cars
    ↓
Multiplayer hardening / UX / packaging
```

The zone graph and core rules must be trustworthy before AI automation.

---

# 69. Coding Standards

Use:

- ES modules.
- `async/await`.
- JSDoc for non-obvious public APIs.
- Meaningful classes/services.
- Small pure functions.
- Constants/enums instead of repeated strings.
- Foundry DataModels for system document data.
- Foundry UUIDs rather than document names for persistent references.
- Localization keys for UI text.

Avoid:

- Giant hook files.
- Global mutable objects.
- Logic directly embedded in Handlebars/templates.
- Hard-coded Scene IDs.
- Hard-coded Actor names.
- Hard-coded official card text.
- Silent `catch` blocks.
- Direct mutation of Document data.
- Old/deprecated Foundry APIs when current equivalents exist.

---

# 70. Code Quality Gates

Before marking a milestone complete:

```text
[ ] No new console errors
[ ] Unit tests pass
[ ] Foundry world loads
[ ] Reload preserves state
[ ] Persisted schema change includes and tests a migration
[ ] State-changing command is revision-checked and idempotent
[ ] Multiplayer behavior checked where relevant
[ ] Localization keys exist
[ ] GM override exists for automated rule where appropriate
[ ] README/IMPLEMENTATION_STATUS updated
[ ] No copyrighted assets added
```

---

# 71. Git / Commit Strategy

Make small milestone-oriented commits.

Examples:

```text
feat: bootstrap zombicide foundry system
feat: add survivor and zombie data models
feat: add zone region integration
feat: implement zone graph pathfinding
feat: implement survivor combat workflow
feat: add zombie target selection
feat: add assisted zombie activation
feat: add spawn card resolver
test: add equal-route zombie movement cases
fix: prevent duplicate zombie phase execution
```

Do not combine the entire project into one massive commit.

---

# 72. Documentation Deliverables

Maintain:

## `README.md`

Include:

- What the project is.
- Supported Foundry version.
- Installation.
- Current features.
- Known limitations.
- Legal/content notice.
- Development instructions.

## `IMPLEMENTATION_STATUS.md`

Use:

```markdown
# Implementation Status

## Current Milestone
Milestone 3 — Zone Engine

## Completed
- [x] Foundry bootstrap
- [x] Survivor model
- [x] Weapon model

## In Progress
- [ ] Region zone registration

## Next
- [ ] Zone graph
- [ ] Door edges

## Known Issues
- ...
```

## `docs/ARCHITECTURE.md`

Document:

- Layers.
- State ownership.
- Authority election and command/transaction flow.
- Persisted schema versions and migrations.
- Game event flow.
- Zone graph.
- Buildings, sight lanes, and LOS.
- Equipment Card-to-Item lifecycle.
- Ruleset abstraction.

## `docs/BOARD_SETUP.md`

Document how a GM creates:

- Regions.
- Adjacency.
- Doors.
- Buildings/dark Zones.
- Street sight lanes and visibility overrides.
- Spawn zones.
- Objectives.
- Exit zones.

---

# 73. Development Test Board

Create one original/simple test Scene.

Example topology:

```text
          [Z5 Spawn]
              |
[Z1] --door-- [Z2] --door-- [Z3]
               |               |
              [Z4] --door-- [Z6 Exit]
```

Properties:

```text
Z1 = starting street
Z2 = room/searchable, Building A
Z3 = street
Z4 = dark room/objective, Building A
Z5 = spawn street
Z6 = exit street

Z1↔Z2 = closed entrance door
Z2↔Z3 = second Building A door
Z4↔Z6 = third Building A door
Z5↔Z2 = fourth Building A door
Z3↔Z6 = configured vertical street sight lane
Z2→Z3→Z6 and Z2→Z4→Z6 = equal-length routes for split tests
```

Use basic colored rectangles or original placeholder shapes.

Do not use scanned game tiles.

The board must exercise:

- Closed door.
- First building reveal and dark-zone spawn.
- Opening another door into the same building without spawning again.
- Open edge.
- Multiple routes.
- Search.
- Spawn.
- Objective.
- Exit.
- LOS.
- Room/street LOS transition and straight street sight lane.
- Noise.
- Split movement.

---

# 74. Developer Test Scenario

Initial actors:

```text
Survivor Alpha — Z1
Survivor Bravo — Z3

2 Walkers — Z5
1 Runner — Z5
```

Initial objectives:

```text
1. Open door Z1↔Z2.
2. Collect objective in Z4.
3. Reach Z6.
```

The scenario should be small enough to run repeatedly during development.

---

# 75. AI Determinism

Zombie AI is rules logic, not machine learning.

Given the same:

- Board graph.
- Door states.
- Survivor positions.
- Noise.
- Zombie positions.
- Ruleset.
- Tie-resolution inputs.

the calculation should produce the same route/decision.

Random decisions should be explicit and use Foundry's/random-source mechanism only when the rules require randomness.

This greatly simplifies testing.

---

# 76. Automation Preview

For complex Zombie Phase operations, build a preview object:

```javascript
{
  group: {
    type: "walker",
    count: 4,
    zoneId: "zone-008"
  },

  decision: {
    mode: "move",
    targetZoneId: "zone-004",
    reason: "visible-survivor",
    path: [
      "zone-008",
      "zone-006"
    ]
  }
}
```

The UI can display:

```text
4 Walkers
Zone 08 → Zone 06
Target: Zone 04
Reason: Visible Survivor

[Apply] [Override] [Inspect]
```

This should exist before enabling fully automatic mode.

---

# 77. Rules Verification Workflow

Whenever implementing a new rule:

1. Identify the official rule section.
2. Write a short internal summary in developer notes.
3. Create examples/test cases.
4. Implement the pure resolver.
5. Unit test.
6. Integrate with Foundry.
7. Test manually on Developer Test Board.

Do not paste the rulebook section into source code.

For rules with expansions/FAQ ambiguity:

```javascript
// TODO(rule-verification): verify expansion-specific behavior.
// Current behavior uses Modern 2E base ruleset default.
```

---

# 78. Copyright / Trademark Boundary

This is a technical compatibility project.

Unless explicit permission is later obtained, do **not** commit/distribute:

- Official logos.
- Survivor artwork.
- Miniature renders.
- Card artwork.
- Board tiles.
- Mission board images.
- Scans.
- Official character portraits.
- Proprietary fonts.
- Large excerpts of official rules.
- Copied card/skill text collections.
- Paid expansion content.

The system should provide **mechanics, schemas, editors, generic test data, and import tools**.

If the package is ever published publicly, perform a separate trademark/licensing review and consider a generic public-facing name if necessary.

---

# 79. Future Expansion Architecture

After Modern 2E is stable, additional rulesets should register through:

```javascript
registerRuleset({
  id: "fantasy",
  ...
});
```

Do not fork the entire engine for each game family.

Potential extension points:

```text
Danger system
Zombie profiles
Targeting
Spawn cards
Necromancer behavior
Doors
Objectives
Noise
Cars
Companions
Special zones
Weapons
Friendly fire
Skill system
Turn phases
```

---

# 80. Potential Future Features

Not required for MVP:

- Mission editor UI.
- Drag-and-drop zone connections.
- Automatic region generation.
- Board setup wizard.
- Custom skill scripting API.
- Undo/redo stack.
- Replay log.
- Statistics screen.
- Campaign progression.
- Spectator mode.
- Mobile-friendly Survivor controls.
- Animated zombie movement.
- Dice animations.
- Audio cues.
- Community content packs.
- Content pack SDK.
- Import/export GUI.
- Foundry package-browser submission.
- Optional gamepad/touch controls.

---

# 81. Definition of Done for v1.0

`v1.0.0` should not be declared until:

```text
[ ] Core Modern 2E gameplay loop is stable
[ ] Survivor Phase is functional
[ ] Zombie Phase is functional
[ ] Spawn Phase is functional
[ ] End Phase is functional
[ ] Zone graph is stable
[ ] Modern 2E LOS and building spawning are stable
[ ] Combat is stable
[ ] Mission objectives work
[ ] Modern 2E vehicle and car actions work
[ ] Game persists through reload
[ ] Multiplayer authority is safe
[ ] English localization complete
[ ] Spanish localization complete
[ ] Test suite covers core engine
[ ] Test board passes end-to-end scenario
[ ] No proprietary content bundled
[ ] Installation documented
[ ] Board setup documented
[ ] Known limitations documented
```

---

# 82. First Codex Task

Start with **Milestone 0 and Milestone 1 only**.

Codex should initially:

1. Inspect the environment/repository.
2. Confirm the runnable Foundry 13.351 build and record it as the exact target.
3. Verify the v13 System/DataModel/ApplicationV2/RegionBehavior APIs against build 13.351.
4. Bootstrap the Game System.
5. Create the manifest.
6. Create initialization code.
7. Add English and Spanish localization scaffolding.
8. Implement Survivor/Zombie and minimal Vehicle Actor DataModels.
9. Implement Weapon/Equipment/Skill Item DataModels.
10. Implement Equipment/Spawn Card and Cards-stack DataModels without draw automation.
11. Register the custom Documents/DataModels.
12. Create minimal functional sheets.
13. Implement the versioned Scene state schema and migration registry.
14. Implement the transaction/command skeleton, revision checks, socket namespace, and active-GM election.
15. Create generic placeholder content.
16. Add `IMPLEMENTATION_STATUS.md`.
17. Update `README.md`.
18. Add and run the pure-engine test command.
19. Verify the world launches without errors.

Do **not** begin zombie pathfinding until these foundations are stable.

After Milestone 1 passes, continue sequentially through this plan unless repository findings require an architectural correction.

---

# 83. Sources / Technical References

Use these as starting points, but Codex should verify the documentation for the actual Foundry version being targeted.

## Foundry VTT

- System Development:
  https://foundryvtt.com/article/system-development/

- System Data Models:
  https://foundryvtt.com/article/system-data-models/

- Introduction to Development:
  https://foundryvtt.com/article/intro-development/

- Scene Regions:
  https://foundryvtt.com/article/scene-regions/

- API Migration Guides:
  https://foundryvtt.com/article/migration/

- Foundry v13 API:
  https://foundryvtt.com/api/v13/

- Foundry v13 Document Sheets (`ApplicationV2`, `ActorSheetV2`, `ItemSheetV2`):
  https://foundryvtt.com/api/v13/modules/foundry.applications.sheets.html

- Foundry v13 RegionBehavior configuration:
  https://foundryvtt.com/api/v13/variables/CONFIG.RegionBehavior.html

- Foundry 13.351 release notes:
  https://foundryvtt.com/releases/13.351

Foundry's documentation establishes that custom Game Systems use `system.json`, custom Document sub-types/DataModels, JavaScript APIs, sheets, and other Foundry Documents. Scene Regions provide defined Scene areas composed of shapes and behaviors/events, making them a suitable Foundry-side representation for the proposed Zone system.

## Zombicide

- Official Game Rules library:
  https://www.zombicide.com/game-rules/

- Official Zombicide 2nd Edition rulebook:
  https://www.zombicide.com/dl/rulebook-zombicide-2nd-edition.pdf

Use the official rules as the authority for exact gameplay behavior. Do not copy the full rules text into the repository.

---

# 84. Final Instruction to Codex

The most important design decision is:

> **Model Zombicide as a zone-graph board game implemented inside Foundry, not as a conventional grid-based RPG.**

Survivor actions, zombie AI, line of sight, noise, doors, spawning, and missions should operate against the logical Zone graph.

Foundry is responsible for:

- Documents.
- Persistence.
- Canvas.
- Tokens.
- Regions.
- Cards/decks.
- UI.
- Chat.
- Multiplayer.
- Permissions.

The custom engine is responsible for:

- Zombicide rules.
- Turn state.
- Action validation.
- Combat.
- Zone relationships.
- Noise.
- Zombie decisions.
- Pathfinding.
- Spawns.
- Objectives.
- Victory/defeat.

Keep those responsibilities separated and the project will remain testable, extensible, and maintainable.
