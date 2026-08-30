import {objectArrayField, stringArrayField, stringField} from "../model-fields.mjs";

export class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: stringField(),
      sourceCardUuid: stringField(),
      tags: stringArrayField(),
      effects: objectArrayField()
    };
  }
}
