const clone = value => structuredClone(value);

export function getDoorInteriorBuildingId(graph, edge) {
  const from = graph?.zones?.[edge?.from];
  const to = graph?.zones?.[edge?.to];
  if (to?.buildingId && ["room", "dark"].includes(to.type)) return to.buildingId;
  if (from?.buildingId && ["room", "dark"].includes(from.type)) return from.buildingId;
  return null;
}

export function revealBuildingOnDoorOpen(buildingState = {}, graph, edgeId) {
  const edge = graph?.edges?.find(candidate => candidate.id === edgeId);
  if (!edge || edge.type !== "door") return {buildingState: clone(buildingState), revealed: false, buildingId: null, edgeId};
  const buildingId = getDoorInteriorBuildingId(graph, edge);
  if (!buildingId || buildingState?.[buildingId]?.revealed) {
    return {buildingState: clone(buildingState), revealed: false, buildingId, edgeId};
  }
  const next = clone(buildingState);
  next[buildingId] = {
    ...(next[buildingId] ?? {}),
    revealed: true,
    triggeringDoorEdgeId: edgeId,
    spawnedDarkZoneIds: [...(next[buildingId]?.spawnedDarkZoneIds ?? [])]
  };
  return {buildingState: next, revealed: true, buildingId, edgeId};
}
