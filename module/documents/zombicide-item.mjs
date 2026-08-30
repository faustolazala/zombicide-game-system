export class ZombicideItem extends Item {
  get originatedFromCard() {
    return Boolean(this.system.sourceCardUuid);
  }
}
