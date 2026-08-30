import {BaseActorData} from "./base-actor-data.mjs";
import {
  booleanField,
  fields,
  integerField,
  nullableStringField,
  stringArrayField,
  stringField
} from "../model-fields.mjs";

export class ZombieData extends BaseActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      zombieType: stringField("walker"),
      profile: new fields.SchemaField({
        actions: integerField(1, {min: 0}),
        damage: integerField(1, {min: 0}),
        toughness: integerField(1, {min: 0}),
        adrenalineReward: integerField(1, {min: 0}),
        targetingPriority: integerField(2, {min: 0})
      }),
      behavior: new fields.SchemaField({
        canOpenDoors: booleanField(false),
        specialMovement: nullableStringField()
      }),
      tags: stringArrayField()
    };
  }
}
