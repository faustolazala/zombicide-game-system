import {BaseItemData} from "./base-item-data.mjs";
import {booleanField, integerField, stringField} from "../model-fields.mjs";

export class EquipmentData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: stringField("utility"),
      slot: stringField("backpack", {choices: ["hand", "body", "backpack", "none"]}),
      stackable: booleanField(false),
      quantity: integerField(1, {min: 0})
    };
  }
}
