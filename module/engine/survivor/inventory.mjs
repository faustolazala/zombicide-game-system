import {assertRule} from "../rule-error.mjs";

export const INVENTORY_DESTINATIONS = Object.freeze(["leftHand", "rightHand", "body", "backpack"]);
const clone = value => structuredClone(value);

export function normalizeInventory(inventory) {
  return {
    leftHandItemId: inventory?.leftHandItemId ?? null,
    rightHandItemId: inventory?.rightHandItemId ?? null,
    bodyItemId: inventory?.bodyItemId ?? null,
    backpackItemIds: [...new Set((inventory?.backpackItemIds ?? []).filter(id => typeof id === "string" && id.length > 0))],
    backpackCapacity: Number.isInteger(inventory?.backpackCapacity) ? inventory.backpackCapacity : 5
  };
}

export function getItemLocation(inventory, itemId) {
  const normalized = normalizeInventory(inventory);
  if (normalized.leftHandItemId === itemId) return "leftHand";
  if (normalized.rightHandItemId === itemId) return "rightHand";
  if (normalized.bodyItemId === itemId) return "body";
  if (normalized.backpackItemIds.includes(itemId)) return "backpack";
  return null;
}

function removeItem(inventory, itemId) {
  const next = normalizeInventory(inventory);
  if (next.leftHandItemId === itemId) next.leftHandItemId = null;
  if (next.rightHandItemId === itemId) next.rightHandItemId = null;
  if (next.bodyItemId === itemId) next.bodyItemId = null;
  next.backpackItemIds = next.backpackItemIds.filter(id => id !== itemId);
  return next;
}

function validateDestination(item, destination) {
  assertRule(INVENTORY_DESTINATIONS.includes(destination), "INVALID_INVENTORY_DESTINATION", `Unknown inventory destination '${destination}'.`);
  assertRule(["weapon", "equipment"].includes(item?.type), "ITEM_NOT_INVENTORY", "Only Weapon and Equipment Items use inventory slots.");
  if (["leftHand", "rightHand"].includes(destination)) {
    assertRule(item.type === "weapon" || item.system?.slot === "hand", "ITEM_NOT_HAND_EQUIPMENT", "This Item cannot be equipped in a Hand slot.");
  }
  if (destination === "body") {
    assertRule(item.type === "equipment" && item.system?.slot === "body", "ITEM_NOT_BODY_EQUIPMENT", "This Item cannot be equipped in the Body slot.");
  }
}

export function moveInventoryItem(inventory, item, destination) {
  validateDestination(item, destination);
  const itemId = item.id ?? item._id;
  assertRule(typeof itemId === "string" && itemId.length > 0, "INVALID_ITEM", "An embedded Item ID is required.");
  const next = removeItem(inventory, itemId);

  if (destination === "backpack") {
    assertRule(next.backpackItemIds.length < next.backpackCapacity, "BACKPACK_FULL", "The Survivor's backpack is full.");
    next.backpackItemIds.push(itemId);
    return next;
  }

  const key = `${destination}ItemId`;
  assertRule(!next[key], "INVENTORY_SLOT_OCCUPIED", `The ${destination} slot is occupied.`);
  next[key] = itemId;
  return next;
}

export function discardInventoryItem(inventory, itemId) {
  assertRule(getItemLocation(inventory, itemId), "ITEM_NOT_IN_INVENTORY", "The Item is not in this Survivor's inventory.");
  return removeItem(inventory, itemId);
}

export function transferInventoryItem(sourceInventory, targetInventory, item, targetItemId = null) {
  const sourceItemId = item.id ?? item._id;
  assertRule(getItemLocation(sourceInventory, sourceItemId), "ITEM_NOT_IN_INVENTORY", "The Item is not in the giving Survivor's inventory.");
  const destinationId = targetItemId ?? sourceItemId;
  const source = removeItem(sourceInventory, sourceItemId);
  const targetItem = {...clone(item), id: destinationId, _id: destinationId};
  const target = moveInventoryItem(targetInventory, targetItem, "backpack");
  return {sourceInventory: source, targetInventory: target};
}
