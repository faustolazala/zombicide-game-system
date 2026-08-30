import {booleanField, fields, objectField, stringField} from "../model-fields.mjs";

export class EquipmentCardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: stringField(),
      itemTemplate: new fields.SchemaField({
        name: stringField(),
        type: stringField("equipment", {choices: ["weapon", "equipment"]}),
        img: stringField(),
        system: objectField()
      }),
      itemLink: new fields.SchemaField({
        embeddedItemUuid: stringField(),
        ownerActorUuid: stringField()
      }),
      inPlay: booleanField(false)
    };
  }
}
