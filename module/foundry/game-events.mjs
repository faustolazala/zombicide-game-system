const CHAT_EVENT_TYPES = new Set([
  "survivorRosterConfigured",
  "survivorAssigned",
  "firstPlayerChanged",
  "survivorActivationStarted",
  "survivorActionSpent",
  "survivorActionRefunded",
  "survivorActivationEnded",
  "inventoryItemMoved",
  "inventoryItemDiscarded",
  "inventoryItemTraded",
  "adrenalineChanged",
  "woundsChanged",
  "missionDefeat",
  "automationResumed"
]);

export async function publishGameEvents(events, {transactionId} = {}) {
  const messages = (events ?? [])
    .filter(event => CHAT_EVENT_TYPES.has(event.type))
    .map(event => game.i18n.localize(`ZOMBICIDE.Chat.${event.type}`));
  if (!messages.length) return null;

  const content = [
    ...messages.map(message => `<p>${foundry.utils.escapeHTML(message)}</p>`),
    `<small>${foundry.utils.escapeHTML(transactionId ?? "")}</small>`
  ].join("");
  return ChatMessage.create({
    speaker: {alias: game.i18n.localize("ZOMBICIDE.SystemTitle")},
    content,
    flags: {zombicide: {transactionId}}
  });
}
