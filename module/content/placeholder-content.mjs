import {SYSTEM_ID} from "../config/constants.mjs";

const PLACEHOLDER_FLAG = "placeholderContent";

function placeholderFlags(kind) {
  return {[SYSTEM_ID]: {[PLACEHOLDER_FLAG]: kind}};
}

function findPlaceholder(collection, kind) {
  return collection.find(document => document.getFlag(SYSTEM_ID, PLACEHOLDER_FLAG) === kind) ?? null;
}

export async function createPlaceholderContent() {
  if (!game.user.isGM) throw new Error("Only a GM may create placeholder content.");

  const actorSources = [
    {
      name: "Placeholder Survivor",
      type: "survivor",
      prototypeToken: {actorLink: true},
      flags: placeholderFlags("survivor"),
      system: {
        description: "Generic development Survivor.",
        identity: {archetype: "placeholder", isKid: false},
        adrenaline: {value: 0},
        actions: {baseOverride: null}
      }
    },
    {
      name: "Placeholder Walker",
      type: "zombie",
      prototypeToken: {actorLink: false},
      flags: placeholderFlags("zombie"),
      system: {
        description: "Generic development Walker.",
        zombieType: "walker",
        profile: {
          actions: 1,
          damage: 1,
          toughness: 1,
          adrenalineReward: 1,
          targetingPriority: 2
        }
      }
    },
    {
      name: "Placeholder Car",
      type: "vehicle",
      prototypeToken: {actorLink: true},
      flags: placeholderFlags("vehicle"),
      system: {
        description: "Generic development Vehicle; car automation is not implemented.",
        seats: {capacity: 4}
      }
    }
  ];

  const itemSources = [
    {
      name: "Placeholder Bat",
      type: "weapon",
      flags: placeholderFlags("weapon"),
      system: {
        description: "Generic melee test weapon.",
        category: "melee",
        dice: 1,
        accuracy: 4,
        damage: 1,
        range: {minimum: 0, maximum: 0}
      }
    },
    {
      name: "Placeholder Supplies",
      type: "equipment",
      flags: placeholderFlags("equipment"),
      system: {description: "Generic test equipment.", category: "utility", quantity: 1}
    },
    {
      name: "Placeholder Skill",
      type: "skill",
      flags: placeholderFlags("skill"),
      system: {description: "Generic test skill with no automated effect.", rulesetKey: "placeholder"}
    }
  ];

  const actorsToCreate = actorSources.filter(source => !findPlaceholder(game.actors, source.flags[SYSTEM_ID][PLACEHOLDER_FLAG]));
  const itemsToCreate = itemSources.filter(source => !findPlaceholder(game.items, source.flags[SYSTEM_ID][PLACEHOLDER_FLAG]));
  const actors = actorsToCreate.length
    ? await CONFIG.Actor.documentClass.createDocuments(actorsToCreate)
    : [];
  const items = itemsToCreate.length
    ? await CONFIG.Item.documentClass.createDocuments(itemsToCreate)
    : [];

  const stacks = [];
  if (!findPlaceholder(game.cards, "equipmentDeck")) {
    const [deck] = await CONFIG.Cards.documentClass.createDocuments([{
      name: "Placeholder Equipment Deck",
      type: "equipmentDeck",
      flags: placeholderFlags("equipmentDeck"),
      system: {purpose: "equipment-draw", rulesetKey: "placeholder"}
    }]);
    await deck.createEmbeddedDocuments("Card", [{
      name: "Placeholder Bat Card",
      type: "equipment",
      system: {
        description: "Creates a generic bat when card lifecycle automation is implemented.",
        itemTemplate: itemSources[0]
      }
    }]);
    stacks.push(deck);
  }

  if (!findPlaceholder(game.cards, "spawnDeck")) {
    const [deck] = await CONFIG.Cards.documentClass.createDocuments([{
      name: "Placeholder Spawn Deck",
      type: "spawnDeck",
      flags: placeholderFlags("spawnDeck"),
      system: {purpose: "zombie-spawn", rulesetKey: "placeholder"}
    }]);
    await deck.createEmbeddedDocuments("Card", [{
      name: "Placeholder Walker Spawn",
      type: "spawn",
      system: {
        description: "Generic data only; drawing and spawning are not automated.",
        effectType: "spawn",
        dangerEntries: {
          blue: {walker: 1},
          yellow: {walker: 1},
          orange: {walker: 2},
          red: {walker: 3}
        },
        rulesetKey: "placeholder"
      }
    }]);
    stacks.push(deck);
  }

  return {actors, items, stacks};
}
