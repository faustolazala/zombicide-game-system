import {BaseActorData} from "./base-actor-data.mjs";
import {
  booleanField,
  fields,
  integerField,
  nullableIntegerField,
  nullableStringField,
  objectField,
  stringArrayField,
  stringField
} from "../model-fields.mjs";

export class SurvivorData extends BaseActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      identity: new fields.SchemaField({
        archetype: stringField(),
        isKid: booleanField(false)
      }),
      wounds: new fields.SchemaField({
        value: integerField(0, {min: 0}),
        maximumOverride: nullableIntegerField({min: 1})
      }),
      adrenaline: new fields.SchemaField({
        value: integerField(0, {min: 0})
      }),
      actions: new fields.SchemaField({
        baseOverride: nullableIntegerField({min: 0})
      }),
      skillProgression: objectField(),
      chosenSkillIds: stringArrayField(),
      inventory: new fields.SchemaField({
        leftHandItemId: nullableStringField(),
        rightHandItemId: nullableStringField(),
        bodyItemId: nullableStringField(),
        backpackItemIds: stringArrayField(),
        backpackCapacity: integerField(5, {min: 0})
      }),
      stats: new fields.SchemaField({
        zombiesKilled: integerField(0, {min: 0}),
        objectivesTaken: integerField(0, {min: 0}),
        searches: integerField(0, {min: 0})
      }),
      controllerMode: stringField("owner", {choices: ["owner", "assigned", "gm"]}),
      assignedUserIds: stringArrayField(),
      gameplayFlags: objectField()
    };
  }
}
