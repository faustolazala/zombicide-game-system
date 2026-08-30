import {stringArrayField, stringField} from "../model-fields.mjs";

export class CardStackData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      purpose: stringField(),
      rulesetKey: stringField(),
      tags: stringArrayField()
    };
  }
}
