# Changelog

## 0.2.3 — 2026-08-30

- Persist explicit Survivor Phase completion when the final assigned Survivor ends activation.
- Keep completion/progress derived from authoritative assignments after every command and refresh.
- Add a clear cross-client phase transition signal for the turn tracker.

## 0.2.2 — 2026-08-30

- Derive final Survivor Phase completion from the remaining assigned Survivors and skip stale empty player entries.
- Refresh open Survivor sheets on every client when authoritative mission Scene state changes.
- Show localized phase names, completed/total progress, and pending Survivor names in the turn tracker.
- Announce the transition to Zombie Phase in chat and explain that Zombie automation begins in Milestone 6.

## 0.2.1 — 2026-08-30

- Repair Survivor assignment and action-state maps whose Document UUID keys were expanded by Foundry persistence.
- Encode Document UUID map keys before saving new Scene state.
- Guard Survivor sheet and command assignment reads against malformed legacy entries.

## 0.2.0 — 2026-08-30

- Add the authority-validated Survivor activation and player-turn engine.
- Add general/restricted action pools, spending ledgers, and explicit GM refunds.
- Add Hand, Body, and Backpack inventory with equip, unequip, trade, discard, and capacity validation.
- Add Adrenaline, Danger Level, Wounds, and immediate Survivor-elimination defeat.
- Add precondition-checked Foundry Document transactions and partial-failure pausing.
- Expand the Survivor ApplicationV2 sheet with setup, turn, action, inventory, and vital controls.
- Add localized chat events and Milestone 2 test coverage.

## 0.1.0 — 2026-08-30

- Bootstrap the system for Foundry VTT 13.351.
- Add Milestone 1 Actor, Item, Card, and Cards DataModels.
- Add minimal ApplicationV2 sheets.
- Add versioned Scene state, migrations, command revisions, socket requests, and GM election.
- Add generic placeholder content and pure-engine tests.
- Add direct Foundry installation and update metadata for the GitHub release.
