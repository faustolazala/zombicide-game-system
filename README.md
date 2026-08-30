# Zombicide Game System

An early Foundry Virtual Tabletop game-system implementation based on the repository's implementation plan. The current code covers Milestones 0 and 1 only: typed Documents, minimal sheets, canonical Scene state, and the multiplayer command foundation.

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
- Generic placeholder world content creator.
- English and Spanish localization scaffolding.

Not yet implemented:

- Mission setup UI and zone/RegionBehavior topology.
- Survivor turns, actions, combat, cards lifecycle, zombie spawning, or zombie AI.
- Vehicle/car gameplay automation.
- Multi-document transaction commits and recovery tooling.
- Production compendium packaging or copyrighted game content.

The authority layer protects normal clients from accidental races. As with any client-side Foundry system, it cannot defend against a deliberately modified GM/client or replace server-side security.

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification status and [zombicide_implementation_plan.md](zombicide_implementation_plan.md) for the full staged design.
