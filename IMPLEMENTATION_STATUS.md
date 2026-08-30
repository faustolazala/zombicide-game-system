# Implementation Status

Target: **Foundry VTT 13.351**

## Milestone 0 — Bootstrap

- [x] Repository and locally visible runtime inspected.
- [x] `system.json`, ES-module entry point, styles, and localization created.
- [x] Manifest compatibility pinned to minimum/verified/maximum `13.351`.
- [x] Pure Node test command added.
- [x] Installable GitHub release metadata and stable Manifest URL configured.
- [x] Launch verified inside a Foundry 13.351 world by the user.

## Milestone 1 — Core Documents

- [x] Survivor, Zombie, and minimal Vehicle Actor DataModels.
- [x] Weapon, Equipment, and Skill Item DataModels.
- [x] Equipment/Spawn Card and five Cards-stack DataModels.
- [x] Custom Actor and Item Documents registered.
- [x] Minimal ApplicationV2 Actor and Item sheets.
- [x] Versioned canonical Scene game-state model and migration registry.
- [x] Compare-and-swap revision validation and bounded transaction-ID history.
- [x] `system.zombicide` socket request/result protocol.
- [x] Deterministic active-GM election and serialized authority queue.
- [x] Idempotent generic placeholder content creator.
- [x] Unit tests for state migration, isolation, stale revisions, duplicates, and history bounds.
- [x] Live two-client socket check in Foundry 13.351.
- [x] Live create/open/edit check for every Document subtype.

## Milestone 2 — Survivor Engine

- [x] Explicit player order, First Player, and Survivor assignment services.
- [x] READY → ACTIVE → ENDED Survivor activation state.
- [x] General and action-specific bonus pools with centralized spending.
- [x] Explicit GM refund linked to the original action transaction.
- [x] Authority permission checks for active-player commands.
- [x] Hand, Body, and Backpack inventory with capacity/slot validation.
- [x] Authority-committed equip, unequip, discard, and Survivor-to-Survivor trade.
- [x] Adrenaline gain, Modern 2E Danger Level derivation, and highest-danger query.
- [x] Adult/kid maximum Wounds and immediate mission defeat on elimination.
- [x] Precondition-checked Document commits and partial-transaction automation pause.
- [x] Survivor sheet controls and English/Spanish localization.
- [x] Persistent public chat events for accepted commands.
- [x] Unit coverage for turns, permissions, actions, refunds, inventory, vitals, and Document commits.
- [ ] Live multiplayer Milestone 2 test flow completed in Foundry 13.351.

## Milestone 3 — Zone Engine

- [x] Typed `zombicideZone` RegionBehavior DataModel registered for Foundry 13.351.
- [x] GM Zone Editor for Region behavior, explicit graph edges, street sight lanes, and visibility overrides.
- [x] Zone membership by Token center with priority and ambiguity detection.
- [x] Explicit Zone graph with open, door, blocked, one-way, and special edges.
- [x] Foundry Wall door state derived into graph snapshots and runtime invalidation hooks.
- [x] Board validation for IDs, building assignments, door references, sight lanes, connectivity, spawn zones, and token membership.
- [x] Building IDs, first-open reveal state, and one-time reveal events.
- [x] Zone-based transient noise with add/remove/clear/query services.
- [x] Modern 2E LOS service for rooms, streets, doors, blockers, lanes, transitions, and overrides.
- [x] Zone debug snapshot API and membership/graph invalidation hooks.
- [x] Unit coverage for graph paths, doors, membership, LOS, reveal, noise, commands, and Foundry registration.
- [ ] Live Zone Engine acceptance flow completed in Foundry 13.351.

## Deliberately deferred

- Combat, objectives, cards, zombie, vehicle, and end-phase engines (Milestones 4–10).
- Multiplayer hardening and recovery UI (Milestone 11).
- UX, packaging, and compendia (Milestones 12–13).

Zombie pathfinding remains deferred until the Zone and targeting foundations are stable.
