import {nullableStringField, objectArrayField, stringArrayField, stringField} from "../model-fields.mjs";

export class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: stringField(),
      sourceCardUuid: nullableStringField(),
      tags: stringArrayField(),
      effects: objectArrayField()
    };
  }
}
