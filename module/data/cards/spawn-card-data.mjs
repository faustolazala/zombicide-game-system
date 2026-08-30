import {fields, objectField, stringField} from "../model-fields.mjs";

export class SpawnCardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: stringField(),
      effectType: stringField("spawn"),
      dangerEntries: new fields.SchemaField({
        blue: objectField(),
        yellow: objectField(),
        orange: objectField(),
        red: objectField()
      }),
      rulesetKey: stringField()
    };
  }
}
