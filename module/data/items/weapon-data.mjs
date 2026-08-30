import {BaseItemData} from "./base-item-data.mjs";
import {
  booleanField,
  fields,
  integerField,
  objectField,
  stringArrayField,
  stringField
} from "../model-fields.mjs";

export class WeaponData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: stringField("melee", {choices: ["melee", "ranged"]}),
      dice: integerField(1, {min: 0}),
      accuracy: integerField(4, {min: 1, max: 6}),
      damage: integerField(1, {min: 0}),
      range: new fields.SchemaField({
        minimum: integerField(0, {min: 0}),
        maximum: integerField(0, {min: 0})
      }),
      noise: new fields.SchemaField({
        attack: booleanField(false),
        openDoor: booleanField(false)
      }),
      traits: new fields.SchemaField({
        dual: booleanField(false),
        silent: booleanField(false),
        sniper: booleanField(false),
        doorBreaker: booleanField(false),
        special: stringArrayField()
      }),
      restrictions: new fields.SchemaField({
        dangerLevels: stringArrayField()
      }),
      rulesetData: objectField()
    };
  }
}
