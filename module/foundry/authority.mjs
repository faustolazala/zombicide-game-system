let authorityUserId = null;

export function electAuthority(users = game.users) {
  const activeGms = [...users]
    .filter(user => user.active && user.isGM)
    .sort((left, right) => left.id.localeCompare(right.id));
  return activeGms[0] ?? null;
}

export function refreshAuthority() {
  const previous = authorityUserId;
  authorityUserId = electAuthority()?.id ?? null;
  if (previous !== authorityUserId) {
    Hooks.callAll("zombicideAuthorityChanged", authorityUserId, previous);
  }
  return authorityUserId;
}

export function getAuthorityUserId() {
  return authorityUserId;
}

export function getAuthorityUser() {
  return authorityUserId ? game.users.get(authorityUserId) ?? null : null;
}

export function isAuthority(user = game.user) {
  return Boolean(user && authorityUserId && user.id === authorityUserId);
}

export function registerAuthorityHooks() {
  Hooks.on("userConnected", refreshAuthority);
  Hooks.on("updateUser", (_user, changes) => {
    if (Object.hasOwn(changes, "active") || Object.hasOwn(changes, "role")) refreshAuthority();
  });
  Hooks.on("createUser", refreshAuthority);
  Hooks.on("deleteUser", refreshAuthority);
}
