export class ZombicideActor extends Actor {
  get maximumWounds() {
    if (this.type !== "survivor") return 0;
    return this.system.wounds.maximumOverride ?? (this.system.identity.isKid ? 2 : 3);
  }

  get isEliminated() {
    return this.type === "survivor" && this.system.wounds.value >= this.maximumWounds;
  }

  get currentDangerLevel() {
    if (this.type !== "survivor") return null;
    const adrenaline = this.system.adrenaline.value;
    if (adrenaline >= 43) return "red";
    if (adrenaline >= 19) return "orange";
    if (adrenaline >= 7) return "yellow";
    return "blue";
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
