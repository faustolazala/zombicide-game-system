import test from "node:test";
import assert from "node:assert/strict";
import {
  discardInventoryItem,
  getItemLocation,
  moveInventoryItem,
  normalizeInventory,
  transferInventoryItem
} from "../module/engine/survivor/inventory.mjs";

const emptyInventory = capacity => ({
  leftHandItemId: null,
  rightHandItemId: null,
  bodyItemId: null,
  backpackItemIds: [],
  backpackCapacity: capacity
});
const weapon = {id: "weapon-1", type: "weapon", system: {}};
const armor = {id: "armor-1", type: "equipment", system: {slot: "body"}};

test("equips and unequips Items without counting equipped slots against the backpack", () => {
  let inventory = moveInventoryItem(emptyInventory(1), weapon, "leftHand");
  inventory = moveInventoryItem(inventory, armor, "body");
  assert.equal(inventory.leftHandItemId, "weapon-1");
  assert.equal(inventory.bodyItemId, "armor-1");
  assert.equal(inventory.backpackItemIds.length, 0);
  inventory = moveInventoryItem(inventory, weapon, "backpack");
  assert.equal(inventory.leftHandItemId, null);
  assert.deepEqual(inventory.backpackItemIds, ["weapon-1"]);
});

test("enforces slot compatibility, occupancy, and backpack capacity", () => {
  assert.throws(() => moveInventoryItem(emptyInventory(1), armor, "leftHand"), error => error.code === "ITEM_NOT_HAND_EQUIPMENT");
  const full = moveInventoryItem(emptyInventory(1), weapon, "backpack");
  assert.throws(
    () => moveInventoryItem(full, {id: "weapon-2", type: "weapon", system: {}}, "backpack"),
    error => error.code === "BACKPACK_FULL"
  );
  const hand = moveInventoryItem(emptyInventory(1), weapon, "leftHand");
  assert.throws(
    () => moveInventoryItem(hand, {id: "weapon-2", type: "weapon", system: {}}, "leftHand"),
    error => error.code === "INVENTORY_SLOT_OCCUPIED"
  );
});

test("transfers to the receiving backpack and removes the giving reference", () => {
  const source = moveInventoryItem(emptyInventory(2), weapon, "leftHand");
  const result = transferInventoryItem(source, emptyInventory(2), weapon, "new-item-id");
  assert.equal(getItemLocation(result.sourceInventory, "weapon-1"), null);
  assert.equal(getItemLocation(result.targetInventory, "new-item-id"), "backpack");
});

test("discards only Items currently tracked by inventory", () => {
  const inventory = moveInventoryItem(emptyInventory(2), weapon, "backpack");
  assert.deepEqual(discardInventoryItem(inventory, "weapon-1").backpackItemIds, []);
  assert.throws(() => discardInventoryItem(normalizeInventory(emptyInventory(2)), "missing"), error => error.code === "ITEM_NOT_IN_INVENTORY");
});
