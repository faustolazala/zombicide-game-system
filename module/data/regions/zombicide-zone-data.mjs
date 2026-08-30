import {
  booleanField,
  fields,
  integerField,
  nullableStringField,
  stringField
} from "../model-fields.mjs";

const RegionBehaviorType = foundry.data.regionBehaviors?.RegionBehaviorType ?? foundry.abstract.TypeDataModel;

export class ZombicideZoneData extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["ZOMBICIDE.RegionBehavior.zombicideZone"];

  static defineSchema() {
    // RegionBehaviorType inherits the abstract TypeDataModel schema contract;
    // its base implementation intentionally throws because the subtype must
    // provide the document schema itself. Do not call super.defineSchema().
    return {
      enabled: booleanField(true),
      zoneId: stringField(),
      type: new fields.StringField({
        required: true,
        nullable: false,
        initial: "special",
        choices: ["street", "room", "dark", "special"]
      }),
      buildingId: nullableStringField(),
      streetAxis: new fields.StringField({
        required: false,
        nullable: true,
        initial: null,
        choices: ["horizontal", "vertical"]
      }),
      membershipPriority: integerField(0),
      searchable: booleanField(false),
      spawnZone: booleanField(false),
      objectiveZone: booleanField(false),
      exitZone: booleanField(false)
    };
  }
}
