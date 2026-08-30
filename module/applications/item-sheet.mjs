const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ItemSheetV2} = foundry.applications.sheets;

export class ZombicideItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["zombicide", "sheet", "item"],
    position: {width: 520, height: 560},
    window: {resizable: true},
    form: {
      closeOnSubmit: false,
      handler: ZombicideItemSheet._onSubmit
    }
  };

  static PARTS = {
    form: {template: "systems/zombicide/templates/item/item-sheet.hbs"}
  };

  get title() {
    const labels = {
      weapon: "ZOMBICIDE.Item.Weapon",
      equipment: "ZOMBICIDE.Item.Equipment",
      skill: "ZOMBICIDE.Item.Skill"
    };
    return `${this.document.name} — ${game.i18n.localize(labels[this.document.type])}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      item: this.item,
      document: this.document,
      system: this.item.system,
      itemType: this.item.type,
      isWeapon: this.item.type === "weapon",
      isEquipment: this.item.type === "equipment",
      isSkill: this.item.type === "skill",
      editable: this.isEditable
    }, {inplace: false});
  }

  static async _onSubmit(event, form, formData) {
    event.preventDefault();
    await this.document.update(formData.object);
  }
}
