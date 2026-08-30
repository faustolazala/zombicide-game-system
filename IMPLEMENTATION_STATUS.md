# Implementation Status

Target: **Foundry VTT 13.351**

## Milestone 0 — Bootstrap

- [x] Repository and locally visible runtime inspected.
- [x] `system.json`, ES-module entry point, styles, and localization created.
- [x] Manifest compatibility pinned to minimum/verified/maximum `13.351`.
- [x] Pure Node test command added.
- [ ] Launch verified inside a Foundry 13.351 world (waiting for the local installation supplied by the user).

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
- [ ] Live two-client socket check in Foundry 13.351.
- [ ] Live create/open/edit check for every Document subtype.

## Deliberately deferred

- RegionBehavior zone schema and board setup (Milestone 2).
- LOS/sight lanes (Milestone 3).
- Survivor, inventory, door, combat, objective, card, zombie, vehicle, and end-phase engines (Milestones 4–10).
- Multiplayer hardening and recovery UI (Milestone 11).
- UX, packaging, and compendia (Milestones 12–13).

Do not begin zombie pathfinding before Milestones 0 and 1 pass the live Foundry checks.
