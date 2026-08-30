import {SYSTEM_ID} from "../config/constants.mjs";
import {SurvivorData} from "../data/actors/survivor-data.mjs";
import {VehicleData} from "../data/actors/vehicle-data.mjs";
import {ZombieData} from "../data/actors/zombie-data.mjs";
import {EquipmentCardData} from "../data/cards/equipment-card-data.mjs";
import {SpawnCardData} from "../data/cards/spawn-card-data.mjs";
import {CardStackData} from "../data/cards/card-stack-data.mjs";
import {EquipmentData} from "../data/items/equipment-data.mjs";
import {SkillData} from "../data/items/skill-data.mjs";
import {WeaponData} from "../data/items/weapon-data.mjs";
import {ZombicideActor} from "../documents/zombicide-actor.mjs";
import {ZombicideItem} from "../documents/zombicide-item.mjs";
import {
  registerMissionStateSheetSync,
  SurvivorSheet,
  VehicleSheet,
  ZombieSheet
} from "../applications/actor-sheet.mjs";
import {ZombicideItemSheet} from "../applications/item-sheet.mjs";

export function registerDocumentsAndDataModels() {
  CONFIG.Actor.documentClass = ZombicideActor;
  CONFIG.Item.documentClass = ZombicideItem;

  Object.assign(CONFIG.Actor.dataModels, {
    survivor: SurvivorData,
    zombie: ZombieData,
    vehicle: VehicleData
  });
  Object.assign(CONFIG.Item.dataModels, {
    weapon: WeaponData,
    equipment: EquipmentData,
    skill: SkillData
  });
  Object.assign(CONFIG.Card.dataModels, {
    equipment: EquipmentCardData,
    spawn: SpawnCardData
  });
  Object.assign(CONFIG.Cards.dataModels, {
    equipmentDeck: CardStackData,
    equipmentInPlay: CardStackData,
    equipmentDiscard: CardStackData,
    spawnDeck: CardStackData,
    spawnDiscard: CardStackData
  });
}

export function registerSheets() {
  const {DocumentSheetConfig} = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(ZombicideActor, SYSTEM_ID, SurvivorSheet, {
    types: ["survivor"],
    makeDefault: true,
    label: "ZOMBICIDE.Actor.Survivor"
  });
  DocumentSheetConfig.registerSheet(ZombicideActor, SYSTEM_ID, ZombieSheet, {
    types: ["zombie"],
    makeDefault: true,
    label: "ZOMBICIDE.Actor.Zombie"
  });
  DocumentSheetConfig.registerSheet(ZombicideActor, SYSTEM_ID, VehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "ZOMBICIDE.Actor.Vehicle"
  });
  DocumentSheetConfig.registerSheet(ZombicideItem, SYSTEM_ID, ZombicideItemSheet, {
    types: ["weapon", "equipment", "skill"],
    makeDefault: true,
    label: "ZOMBICIDE.SystemTitle"
  });
  registerMissionStateSheetSync();
}
