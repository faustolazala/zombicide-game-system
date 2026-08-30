export class DocumentTransactionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DocumentTransactionError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function documentPrecondition(document) {
  return {
    uuid: document.uuid,
    modifiedTime: document._stats?.modifiedTime ?? null
  };
}

export function updateDocumentChange(document, data) {
  return {
    operation: "updateDocument",
    uuid: document.uuid,
    data: structuredClone(data),
    preconditions: [documentPrecondition(document)]
  };
}

async function validatePreconditions(changes) {
  const documents = new Map();
  const preconditions = new Map();
  for (const change of changes) {
    for (const precondition of change.preconditions ?? []) {
      const previous = preconditions.get(precondition.uuid);
      if (previous && previous.modifiedTime !== precondition.modifiedTime) {
        throw new DocumentTransactionError("INCONSISTENT_PRECONDITION", `Conflicting preconditions for '${precondition.uuid}'.`);
      }
      preconditions.set(precondition.uuid, precondition);
    }
  }

  for (const precondition of preconditions.values()) {
    const document = await fromUuid(precondition.uuid);
    if (!document) {
      throw new DocumentTransactionError("DOCUMENT_NOT_FOUND", `Document '${precondition.uuid}' no longer exists.`);
    }
    const actualModifiedTime = document._stats?.modifiedTime ?? null;
    if (precondition.modifiedTime !== null && actualModifiedTime !== precondition.modifiedTime) {
      throw new DocumentTransactionError(
        "DOCUMENT_CHANGED",
        `Document '${precondition.uuid}' changed before the command could commit.`,
        {uuid: precondition.uuid, expectedModifiedTime: precondition.modifiedTime, actualModifiedTime}
      );
    }
    documents.set(precondition.uuid, document);
  }
  return documents;
}

export async function commitDocumentChanges(changes, {transactionId} = {}) {
  if (!Array.isArray(changes)) throw new TypeError("Document changes must be an array.");
  const documents = await validatePreconditions(changes);
  let appliedChanges = 0;

  try {
    for (const change of changes) {
      if (change.operation === "updateDocument") {
        const document = documents.get(change.uuid) ?? await fromUuid(change.uuid);
        if (!document) throw new DocumentTransactionError("DOCUMENT_NOT_FOUND", `Document '${change.uuid}' no longer exists.`);
        await document.update(change.data, {zombicideTransactionId: transactionId});
      } else if (change.operation === "createEmbeddedDocuments") {
        const parent = documents.get(change.parentUuid) ?? await fromUuid(change.parentUuid);
        if (!parent) throw new DocumentTransactionError("DOCUMENT_NOT_FOUND", `Parent '${change.parentUuid}' no longer exists.`);
        await parent.createEmbeddedDocuments(change.documentName, change.data, {
          keepId: Boolean(change.keepId),
          zombicideTransactionId: transactionId
        });
      } else if (change.operation === "deleteEmbeddedDocuments") {
        const parent = documents.get(change.parentUuid) ?? await fromUuid(change.parentUuid);
        if (!parent) throw new DocumentTransactionError("DOCUMENT_NOT_FOUND", `Parent '${change.parentUuid}' no longer exists.`);
        await parent.deleteEmbeddedDocuments(change.documentName, change.ids, {zombicideTransactionId: transactionId});
      } else {
        throw new DocumentTransactionError("UNKNOWN_DOCUMENT_OPERATION", `Unknown Document operation '${change.operation}'.`);
      }
      appliedChanges += 1;
    }
  } catch (error) {
    error.appliedChanges = appliedChanges;
    throw error;
  }

  return {appliedChanges};
}
