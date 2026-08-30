const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

export class ZombicideActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["zombicide", "sheet", "actor"],
    position: {width: 580, height: 620},
    window: {resizable: true},
    form: {
      closeOnSubmit: false,
      handler: ZombicideActorSheet._onSubmit
    }
  };

  static PARTS = {
    form: {template: "systems/zombicide/templates/actor/actor-sheet.hbs"}
  };

  get title() {
    const labels = {
      survivor: "ZOMBICIDE.Actor.Survivor",
      zombie: "ZOMBICIDE.Actor.Zombie",
      vehicle: "ZOMBICIDE.Actor.Vehicle"
    };
    return `${this.document.name} — ${game.i18n.localize(labels[this.document.type])}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      actor: this.actor,
      document: this.document,
      system: this.actor.system,
      actorType: this.actor.type,
      isSurvivor: this.actor.type === "survivor",
      isZombie: this.actor.type === "zombie",
      isVehicle: this.actor.type === "vehicle",
      editable: this.isEditable,
      items: this.actor.items.map(item => ({id: item.id, name: item.name, type: item.type}))
    }, {inplace: false});
  }

  static async _onSubmit(event, form, formData) {
    event.preventDefault();
    await this.document.update(formData.object);
  }
}

export class SurvivorSheet extends ZombicideActorSheet {}
export class ZombieSheet extends ZombicideActorSheet {}
export class VehicleSheet extends ZombicideActorSheet {}
