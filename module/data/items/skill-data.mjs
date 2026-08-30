import {BaseItemData} from "./base-item-data.mjs";
import {stringArrayField, stringField} from "../model-fields.mjs";

export class SkillData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      trigger: stringField("passive"),
      actionTypes: stringArrayField(),
      rulesetKey: stringField()
    };
  }
}
