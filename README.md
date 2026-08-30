# Zombicide Game System

An early Foundry Virtual Tabletop game-system implementation based on the repository's implementation plan. The current code covers Milestones 0–3: typed Documents, canonical Scene state, multiplayer authority, Survivor turns, and the Region-based Zone Engine.

## Compatibility

This repository deliberately targets **Foundry VTT 13.351 exactly**. `system.json` sets the minimum, verified, and maximum compatibility versions to `13.351`.

## Install for development

1. Place or link this repository at `<Foundry user-data>/Data/systems/zombicide`.
2. Start Foundry 13.351 and create a world using **Zombicide Game System**.
3. Open the browser console and confirm the initialization line has no following errors.
4. As a GM, create a Scene and make it the active mission Scene from the console:

   ```js
   await game.zombicide.state.setActiveScene(canvas.scene)
   await game.zombicide.state.ensure()
   ```

5. Optional: create idempotent generic development Documents and decks:

   ```js
   await game.zombicide.createPlaceholderContent()
   ```

## Install from Foundry

From Foundry's **Setup → Game Systems → Install System** dialog, paste this URL into **Manifest URL**:

```text
https://raw.githubusercontent.com/faustolazala/zombicide-game-system/main/system.json
```

The manifest tracks the newest completed milestone release. Before updating, back up any test world containing data you want to preserve.

## Milestone 2 test flow

1. Create or open a Scene and set it as the active mission Scene using the console commands above.
2. Create two player Users and at least one Survivor for each player.
3. As GM, open each Survivor sheet, choose a User, and click **Assign Survivor**.
4. On one Survivor, select its assigned User and click **Set First Player**.
5. Log in as the active player, open an assigned Survivor, and click **Start Activation**.
6. Use the action buttons to spend actions while resolving their board consequences manually. Move, Search, Door, Objective, and attack automation belong to later milestones.
7. Drag generic Weapon/Equipment Items onto the Survivor, then test Hand, Body, Backpack, trade, and discard controls.
8. Test Adrenaline and Wound controls. Reaching maximum Wounds must immediately end the mission in defeat.
9. Click **End Activation**. After all of the player's assigned Survivors activate once, control must pass to the next player. The tracker shows completed/total and pending Survivors. After all players finish, every open sheet must show **Zombie Phase** and chat must announce the transition.
10. Refresh both clients during the turn and confirm action, inventory, player-order, and phase state persists without duplicate actions.

## Milestone 3 test flow

1. As GM, draw Foundry Regions over the board zones on the active mission Scene.
2. Open the Zone Editor from the console:

   ```js
   await game.zombicide.zones.openEditor()
   ```

3. Give every Region a stable Zone ID and type. Assign `buildingId` to every room/dark Zone; configure a street sight axis for street Zones.
4. In the graph JSON editor, configure explicit `edges`, `sightLanes`, and any `visibilityOverrides`, then click **Save Graph**.
5. Click **Validate Board**. Fix missing IDs, broken door UUIDs, disconnected components, missing sight lanes, or ambiguous/out-of-zone Tokens reported by the validator.
6. Use the API for focused checks while building a board:

   ```js
   await game.zombicide.zones.validate()
   await game.zombicide.zones.getGraph()
   await game.zombicide.zones.debugSnapshot()
   await game.zombicide.zones.openDebugOverlay()
   game.zombicide.zones.getTokenZone(token)
   game.zombicide.zones.getSurvivorsInZone("zone-001")
   game.zombicide.zones.getZombiesInZone("zone-001")
   ```

7. Configure a graph edge with `type: "door"` and its Foundry Wall UUID. Opening/closing that Wall changes movement and LOS; the first qualifying opening records building reveal state and later openings do not retrigger it.
8. Add and clear transient noise through `game.zombicide.zones.request("zone.addNoise", {zoneId, amount, source})` or the corresponding GM command handlers. Noise is stored in authoritative Scene state and is visible in `debugSnapshot()`.

The Zone Engine is intentionally rules-first: combat, objective resolution, card draws, spawning, and zombie AI consume these services in later milestones.

## Development checks

Run the Foundry-independent state and command tests with:

```sh
npm test
```

The test script uses Node's same-process test isolation so it also runs in restricted Windows development environments that disallow child-process spawning.

Run JavaScript syntax checking plus the test suite with:

```sh
npm run check
```

## Current scope

Implemented:

- Survivor, Zombie, and minimal Vehicle Actor DataModels.
- Weapon, Equipment, and Skill Item DataModels.
- Equipment/Spawn Card and deck-stack DataModels.
- Custom Actor and Item Documents with minimal ApplicationV2 sheets.
- Versioned `flags.zombicide.gameState` Scene state and migration registry.
- Revision-based commands, bounded transaction idempotency, system socket, and deterministic active-GM election.
- Explicit player order, First Player ownership, and Survivor-to-player assignments.
- Survivor activation state, general/restricted action pools, spending ledger, and GM refunds.
- Authority-validated Hand, Body, and Backpack inventory; equip, unequip, trade, and discard.
- Adrenaline, derived Danger Level, Wounds, and immediate elimination defeat.
- Precondition-checked Document transactions with partial-failure pause behavior.
- Persistent public chat events for accepted Survivor commands.
- Generic placeholder world content creator.
- English and Spanish localization scaffolding.

Not yet implemented:

- Mission setup UI beyond the GM Zone Editor and board validation.
- Zone-aware movement, searching, objectives, combat, cards lifecycle, zombie spawning, or zombie AI.
- Vehicle/car gameplay automation.
- Full transaction reconciliation UI and undo tooling.
- Production compendium packaging or copyrighted game content.

The authority layer protects normal clients from accidental races. As with any client-side Foundry system, it cannot defend against a deliberately modified GM/client or replace server-side security.

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification status and [zombicide_implementation_plan.md](zombicide_implementation_plan.md) for the full staged design.
