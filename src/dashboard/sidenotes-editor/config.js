export const dashboardEditorConfig = Object.freeze({
  enabledBlogIds: ["colin"],
  disabledBlogIds: ["sndaily", "ct", "hom"],
  postPathPattern: /^\/([^/]+)\/dashboard\/posts\/(?:new|[^/]+)\/?$/,
  pilotQueryKey: "sn-editor",
  pilotStoragePrefix: "sidenotes:dashboard-editor:pilot:",
  sourceRefreshDelay: 240,
});

function readStorage(storage, key) {
  try {
    return storage?.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    if (value === null) {
      storage?.removeItem(key);
    } else {
      storage?.setItem(key, value);
    }
  } catch {
    // Private browsing or a locked-down Dashboard can make storage unavailable.
  }
}

export function resolveDashboardTarget({
  pathname,
  search = "",
  storage,
  config = dashboardEditorConfig,
}) {
  const match = pathname.match(config.postPathPattern);
  if (!match) return { eligible: false, reason: "path" };

  const blogId = match[1];
  if (
    !config.enabledBlogIds.includes(blogId) ||
    config.disabledBlogIds.includes(blogId)
  ) {
    return { eligible: false, reason: "blog", blogId };
  }

  const storageKey = `${config.pilotStoragePrefix}${blogId}`;
  const queryValue = new URLSearchParams(search).get(config.pilotQueryKey);

  if (queryValue === "1") {
    writeStorage(storage, storageKey, "1");
    return { eligible: true, blogId, pilot: "query" };
  }

  if (queryValue === "0") {
    writeStorage(storage, storageKey, null);
    return { eligible: false, reason: "disabled", blogId };
  }

  if (readStorage(storage, storageKey) === "1") {
    return { eligible: true, blogId, pilot: "stored" };
  }

  return { eligible: false, reason: "pilot", blogId };
}
