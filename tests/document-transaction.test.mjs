import test from "node:test";
import assert from "node:assert/strict";
import {
  commitDocumentChanges,
  documentPrecondition,
  updateDocumentChange
} from "../module/foundry/document-transaction.mjs";

function createDocument(uuid, modifiedTime = 1) {
  return {
    uuid,
    _stats: {modifiedTime},
    updates: [],
    embeddedCreates: [],
    embeddedDeletes: [],
    async update(data) {
      this.updates.push(structuredClone(data));
      this._stats.modifiedTime += 1;
    },
    async createEmbeddedDocuments(documentName, data) {
      this.embeddedCreates.push({documentName, data: structuredClone(data)});
    },
    async deleteEmbeddedDocuments(documentName, ids) {
      this.embeddedDeletes.push({documentName, ids: [...ids]});
    }
  };
}

test("prevalidates and commits calculated Document changes", async () => {
  const actor = createDocument("Actor.one");
  globalThis.fromUuid = async uuid => uuid === actor.uuid ? actor : null;
  const result = await commitDocumentChanges([
    updateDocumentChange(actor, {"system.adrenaline.value": 1}),
    {
      operation: "deleteEmbeddedDocuments",
      parentUuid: actor.uuid,
      documentName: "Item",
      ids: ["item-1"],
      preconditions: [documentPrecondition(actor)]
    }
  ], {transactionId: "tx-1"});
  assert.equal(result.appliedChanges, 2);
  assert.deepEqual(actor.updates, [{"system.adrenaline.value": 1}]);
  assert.deepEqual(actor.embeddedDeletes[0].ids, ["item-1"]);
});

test("rejects a stale Document before applying any changes", async () => {
  const actor = createDocument("Actor.one", 2);
  globalThis.fromUuid = async () => actor;
  const change = updateDocumentChange(actor, {name: "New"});
  change.preconditions[0].modifiedTime = 1;
  await assert.rejects(
    commitDocumentChanges([change], {transactionId: "tx-stale"}),
    error => error.code === "DOCUMENT_CHANGED"
  );
  assert.equal(actor.updates.length, 0);
});

test("reports how many operations were applied before a partial failure", async () => {
  const actor = createDocument("Actor.one");
  actor.deleteEmbeddedDocuments = async () => {
    throw new Error("delete failed");
  };
  globalThis.fromUuid = async () => actor;
  const preconditions = [documentPrecondition(actor)];
  await assert.rejects(
    commitDocumentChanges([
      {operation: "updateDocument", uuid: actor.uuid, data: {name: "Updated"}, preconditions},
      {operation: "deleteEmbeddedDocuments", parentUuid: actor.uuid, documentName: "Item", ids: ["item-1"], preconditions}
    ]),
    error => error.appliedChanges === 1
  );
});
