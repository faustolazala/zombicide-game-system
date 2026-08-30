import {stringField} from "../model-fields.mjs";

export class BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: stringField()
    };
  }
}
