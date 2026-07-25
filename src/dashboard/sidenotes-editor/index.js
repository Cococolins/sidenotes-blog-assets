import { findBearEditorDom } from "./bear-adapter.js";
import { dashboardEditorConfig, resolveDashboardTarget } from "./config.js";
import { DashboardEditorLifecycle } from "./lifecycle.js";

const LOG_PREFIX = "[Sidenotes Editor]";

function getStorage(windowObject) {
  try {
    return windowObject.localStorage;
  } catch {
    return null;
  }
}

export function mountDashboardEditor({
  documentObject = document,
  windowObject = window,
} = {}) {
  const target = resolveDashboardTarget({
    pathname: windowObject.location.pathname,
    search: windowObject.location.search,
    storage: getStorage(windowObject),
    config: dashboardEditorConfig,
  });

  if (!target.eligible) return null;

  const dom = findBearEditorDom(documentObject);
  if (!dom) {
    console.warn(LOG_PREFIX, "Bear 编辑页 DOM 契约不匹配，保持原生编辑器。");
    return null;
  }

  const lifecycle = new DashboardEditorLifecycle({
    documentObject,
    windowObject,
    dom,
    blogId: target.blogId,
  });

  if (!lifecycle.mount()) return null;

  windowObject.SidenotesDashboardEditor = {
    blogId: target.blogId,
    pilot: target.pilot,
    get mode() {
      return lifecycle.mode;
    },
    destroy() {
      lifecycle.destroy();
      delete windowObject.SidenotesDashboardEditor;
    },
  };

  return lifecycle;
}

function boot() {
  mountDashboardEditor();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
