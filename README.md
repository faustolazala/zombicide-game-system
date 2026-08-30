# Zombicide Game System

An early Foundry Virtual Tabletop game-system implementation based on the repository's implementation plan. The current code covers Milestones 0–2: typed Documents, canonical Scene state, multiplayer authority, and manual Survivor-turn bookkeeping.

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
9. Click **End Activation**. After all of the player's assigned Survivors activate once, control must pass to the next player. After all players finish, the phase becomes `zombie`.
10. Refresh both clients during the turn and confirm action, inventory, player-order, and phase state persists without duplicate actions.

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

- Mission setup UI and zone/RegionBehavior topology.
- Zone-aware movement, searching, doors, objectives, combat, cards lifecycle, zombie spawning, or zombie AI.
- Vehicle/car gameplay automation.
- Full transaction reconciliation UI and undo tooling.
- Production compendium packaging or copyrighted game content.

The authority layer protects normal clients from accidental races. As with any client-side Foundry system, it cannot defend against a deliberately modified GM/client or replace server-side security.

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification status and [zombicide_implementation_plan.md](zombicide_implementation_plan.md) for the full staged design.
