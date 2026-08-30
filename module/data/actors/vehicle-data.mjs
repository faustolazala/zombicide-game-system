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

export class VehicleData extends BaseActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      vehicleType: stringField("car"),
      seats: new fields.SchemaField({
        driverSurvivorUuid: nullableStringField(),
        passengerSurvivorUuids: stringArrayField(),
        capacity: integerField(4, {min: 1})
      }),
      storage: new fields.SchemaField({
        itemIds: stringArrayField(),
        capacity: nullableIntegerField({min: 0})
      }),
      profile: new fields.SchemaField({
        actions: stringArrayField(),
        movement: objectField(),
        attack: objectField()
      }),
      state: new fields.SchemaField({
        disabled: booleanField(false)
      }),
      linkedTokenRequired: booleanField(true)
    };
  }
}
