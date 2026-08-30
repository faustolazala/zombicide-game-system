import {getDangerLevel, getMaximumWounds} from "../engine/survivor/vitals.mjs";

export class ZombicideActor extends Actor {
  get maximumWounds() {
    if (this.type !== "survivor") return 0;
    return getMaximumWounds(this.system);
  }

  get isEliminated() {
    return this.type === "survivor" && this.system.wounds.value >= this.maximumWounds;
  }

  get currentDangerLevel() {
    if (this.type !== "survivor") return null;
    return getDangerLevel(this.system.adrenaline.value);
  }

  get dangerLevel() {
    return this.currentDangerLevel;
  }

  get baseActions() {
    if (this.type !== "survivor") return 0;
    return this.system.actions.baseOverride ?? 3;
  }

  get activeSkills() {
    return this.type === "survivor" ? this.items.filter(item => item.type === "skill") : [];
  }

  get equippedWeapons() {
    if (this.type !== "survivor") return [];
    const equippedIds = new Set([
      this.system.inventory.leftHandItemId,
      this.system.inventory.rightHandItemId
    ].filter(Boolean));
    return this.items.filter(item => item.type === "weapon" && equippedIds.has(item.id));
  }
}
