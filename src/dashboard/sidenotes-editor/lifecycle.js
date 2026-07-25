import { isBearEditorAction } from "./bear-adapter.js";
import { dashboardEditorConfig } from "./config.js";
import { createVisualEditor } from "./create-editor.js";
import {
  checkMarkdownRoundTrip,
  describeCompatibility,
  scanMarkdownCompatibility,
} from "./markdown-compatibility.js";
import { createToolbar } from "./toolbar.js";

const LOG_PREFIX = "[Sidenotes Editor]";

function createButton(documentObject, label, className) {
  const button = documentObject.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function approximateCharacterCount(markdown) {
  return Array.from(
    markdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`>#-]/g, "")
      .replace(/\s+/g, ""),
  ).length;
}

export class DashboardEditorLifecycle {
  constructor({
    documentObject = document,
    windowObject = window,
    dom,
    blogId,
    config = dashboardEditorConfig,
  }) {
    this.document = documentObject;
    this.window = windowObject;
    this.form = dom.form;
    this.textarea = dom.textarea;
    this.header = dom.header;
    this.blogId = blogId;
    this.config = config;
    this.editor = null;
    this.toolbar = null;
    this.compatibility = { safe: false, reasons: [] };
    this.mode = "source";
    this.internalTextareaSync = false;
    this.visualSyncPending = false;
    this.isComposing = false;
    this.compositionSyncPending = false;
    this.sourceRefreshTimer = null;
    this.viewportFrame = null;
    this.abortController = new AbortController();
    this.suspendedEnhancements = [];
    this.originalTextareaState = {
      className: this.textarea.className,
      hidden: this.textarea.hidden,
      ariaHidden: this.textarea.getAttribute("aria-hidden"),
    };
  }

  mount() {
    if (this.form.dataset.snEditorMounted === "true") return false;

    try {
      this.createShell();
      this.suspendConflictingEnhancements();
      this.attachLifecycleListeners();

      const staticResult = scanMarkdownCompatibility(this.textarea.value);
      if (staticResult.safe) {
        const initialized = this.initializeVisualEditor(this.textarea.value);
        if (!initialized && this.compatibility.reasons[0]?.code === "init-error") {
          throw new Error(this.compatibility.reasons[0].detail);
        }
      } else {
        this.setCompatibility(staticResult);
      }

      this.form.dataset.snEditorMounted = "true";
      this.shell.dataset.snEditorMounted = "true";
      this.setMode(this.editor && this.compatibility.safe ? "visual" : "source");
      this.updateStatus();
      this.updateViewportHint();
      return true;
    } catch (error) {
      this.rollback();
      this.showNativeFallbackNotice();
      console.error(LOG_PREFIX, "初始化失败，已恢复 Bear 原生编辑器。", error);
      return false;
    }
  }

  createShell() {
    const documentObject = this.document;
    this.marker = documentObject.createComment("sidenotes-editor-textarea");
    this.shell = documentObject.createElement("section");
    this.shell.id = "sn-editor-root";
    this.shell.className = "sn-editor";
    this.shell.setAttribute("aria-label", "Sidenotes 正文编辑器");

    const topbar = documentObject.createElement("div");
    topbar.className = "sn-editor__topbar";

    const tabs = documentObject.createElement("div");
    tabs.className = "sn-editor__tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "编辑模式");

    this.visualButton = createButton(
      documentObject,
      "Visual",
      "sn-editor__tab",
    );
    this.visualButton.id = "sn-editor-visual-tab";
    this.visualButton.setAttribute("role", "tab");
    this.visualButton.setAttribute("aria-controls", "sn-editor-visual");
    this.visualButton.addEventListener("click", () => {
      if (!this.editor || !this.compatibility.safe) {
        this.refreshFromTextarea({ explicit: true });
      }
      if (this.editor && this.compatibility.safe) {
        this.setMode("visual", { focus: true });
      }
    });

    this.sourceButton = createButton(
      documentObject,
      "Markdown",
      "sn-editor__tab",
    );
    this.sourceButton.id = "sn-editor-source-tab";
    this.sourceButton.setAttribute("role", "tab");
    this.sourceButton.setAttribute("aria-controls", "sn-editor-source");
    this.sourceButton.addEventListener("click", () => {
      if (this.flushVisualToTextarea()) {
        this.setMode("source", { focus: true });
      }
    });

    tabs.append(this.visualButton, this.sourceButton);

    const topbarActions = documentObject.createElement("div");
    topbarActions.className = "sn-editor__topbar-actions";

    this.status = documentObject.createElement("span");
    this.status.className = "sn-editor__status";
    this.status.setAttribute("aria-live", "polite");

    this.fullscreenButton = createButton(
      documentObject,
      "全屏",
      "sn-editor__fullscreen",
    );
    this.fullscreenButton.setAttribute("aria-pressed", "false");
    this.fullscreenButton.addEventListener("click", () =>
      this.toggleFullscreen(),
    );
    topbarActions.append(this.status, this.fullscreenButton);
    topbar.append(tabs, topbarActions);

    this.message = documentObject.createElement("div");
    this.message.className = "sn-editor__message";
    this.message.hidden = true;
    this.message.setAttribute("role", "status");

    this.messageText = documentObject.createElement("span");
    this.recheckButton = createButton(
      documentObject,
      "重新检测",
      "sn-editor__recheck",
    );
    this.recheckButton.addEventListener("click", () =>
      this.refreshFromTextarea({ explicit: true }),
    );
    this.message.append(this.messageText, this.recheckButton);

    this.toolbarHost = documentObject.createElement("div");
    this.toolbarHost.className = "sn-editor__toolbar-host";

    this.visualHost = documentObject.createElement("div");
    this.visualHost.id = "sn-editor-visual";
    this.visualHost.className = "sn-editor__visual";
    this.visualHost.setAttribute("role", "tabpanel");
    this.visualHost.setAttribute("aria-labelledby", this.visualButton.id);

    this.sourceHost = documentObject.createElement("div");
    this.sourceHost.id = "sn-editor-source";
    this.sourceHost.className = "sn-editor__source-host";
    this.sourceHost.setAttribute("role", "tabpanel");
    this.sourceHost.setAttribute("aria-labelledby", this.sourceButton.id);

    this.shell.append(
      topbar,
      this.message,
      this.toolbarHost,
      this.visualHost,
      this.sourceHost,
    );

    this.textarea.parentNode.insertBefore(this.marker, this.textarea);
    this.textarea.parentNode.insertBefore(this.shell, this.marker);
    this.sourceHost.append(this.textarea);
    this.textarea.classList.add("sn-editor__source");
    this.textarea.removeAttribute("aria-hidden");
  }

  suspendConflictingEnhancements() {
    const selectors = [
      "#sn-md-toolbar",
      ".markdown-toolbar",
      ".markdown_line_fixer",
    ];
    const elements = new Set(
      selectors.flatMap((selector) => [
        ...this.document.querySelectorAll(selector),
      ]),
    );

    for (const element of elements) {
      if (this.shell.contains(element)) continue;
      this.suspendedEnhancements.push({
        element,
        hidden: element.hidden,
        ariaHidden: element.getAttribute("aria-hidden"),
        suspendedAttribute: element.getAttribute(
          "data-sn-editor-suspended",
        ),
      });
      element.hidden = true;
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("data-sn-editor-suspended", "true");
    }
  }

  restoreConflictingEnhancements() {
    for (const record of this.suspendedEnhancements) {
      if (!record.element.isConnected) continue;
      record.element.hidden = record.hidden;
      if (record.ariaHidden === null) {
        record.element.removeAttribute("aria-hidden");
      } else {
        record.element.setAttribute("aria-hidden", record.ariaHidden);
      }
      if (record.suspendedAttribute === null) {
        record.element.removeAttribute("data-sn-editor-suspended");
      } else {
        record.element.setAttribute(
          "data-sn-editor-suspended",
          record.suspendedAttribute,
        );
      }
    }
    this.suspendedEnhancements = [];
  }

  initializeVisualEditor(markdown) {
    const staticResult = scanMarkdownCompatibility(markdown);
    if (!staticResult.safe) {
      this.setCompatibility(staticResult);
      return false;
    }

    let candidate;
    try {
      candidate = createVisualEditor({
        element: this.visualHost,
        markdown,
        onUpdate: () => this.onVisualUpdate(),
      });
    } catch (error) {
      this.setCompatibility({
        safe: false,
        reasons: [
          {
            code: "init-error",
            label: "editor initialization error",
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
      });
      return false;
    }

    const roundTrip = checkMarkdownRoundTrip(candidate, markdown);
    if (!roundTrip.safe) {
      candidate.destroy();
      this.visualHost.replaceChildren();
      this.setCompatibility(roundTrip);
      return false;
    }

    this.editor = candidate;
    this.toolbar = createToolbar(candidate, this.document);
    this.toolbarHost.replaceChildren(this.toolbar.element);
    this.attachCompositionListeners();
    this.visualSyncPending = false;
    this.setCompatibility({ safe: true, reasons: [] });
    return true;
  }

  destroyVisualEditor() {
    this.detachCompositionListeners?.();
    this.detachCompositionListeners = null;
    this.toolbar?.destroy();
    this.toolbar = null;
    this.editor?.destroy();
    this.editor = null;
    this.toolbarHost?.replaceChildren();
    this.visualHost?.replaceChildren();
  }

  attachCompositionListeners() {
    const editorDom = this.editor.view.dom;
    const onCompositionStart = () => {
      this.isComposing = true;
    };
    const onCompositionEnd = () => {
      this.isComposing = false;
      if (!this.compositionSyncPending) return;
      this.compositionSyncPending = false;
      queueMicrotask(() => this.flushVisualToTextarea());
    };

    editorDom.addEventListener("compositionstart", onCompositionStart);
    editorDom.addEventListener("compositionend", onCompositionEnd);
    this.detachCompositionListeners = () => {
      editorDom.removeEventListener("compositionstart", onCompositionStart);
      editorDom.removeEventListener("compositionend", onCompositionEnd);
    };
  }

  onVisualUpdate() {
    this.visualSyncPending = true;
    if (this.isComposing) {
      this.compositionSyncPending = true;
      return;
    }
    this.flushVisualToTextarea();
  }

  flushVisualToTextarea(event) {
    if (!this.editor || this.mode !== "visual" || !this.visualSyncPending) {
      return true;
    }

    if (this.isComposing) {
      this.compositionSyncPending = true;
      this.blockNativeAction(
        event,
        "中文输入尚未确认，请先完成当前输入再保存。",
      );
      return false;
    }

    try {
      const markdown = this.editor.getMarkdown();
      if (markdown !== this.textarea.value) {
        this.internalTextareaSync = true;
        this.textarea.value = markdown;
        this.textarea.dispatchEvent(
          new this.window.Event("input", { bubbles: true }),
        );
        this.internalTextareaSync = false;
      }
      this.visualSyncPending = false;
      this.updateStatus();
      return true;
    } catch (error) {
      this.internalTextareaSync = false;
      this.setMode("source");
      this.showMessage(
        "Visual 内容无法安全转换为 Markdown，已切回源码模式。请检查正文后再保存。",
      );
      this.blockNativeAction(event);
      console.error(LOG_PREFIX, "同步失败。", error);
      return false;
    }
  }

  blockNativeAction(event, message) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    if (message) this.showMessage(message, { allowRecheck: false });
  }

  setMode(mode, { focus = false } = {}) {
    if (mode === "visual" && (!this.editor || !this.compatibility.safe)) {
      return;
    }

    this.mode = mode;
    const visual = mode === "visual";
    this.shell.dataset.mode = mode;
    this.visualButton.setAttribute("aria-selected", String(visual));
    this.sourceButton.setAttribute("aria-selected", String(!visual));
    this.visualButton.tabIndex = visual ? 0 : -1;
    this.sourceButton.tabIndex = visual ? -1 : 0;
    this.visualButton.classList.toggle("is-active", visual);
    this.sourceButton.classList.toggle("is-active", !visual);
    this.visualButton.disabled = !this.editor || !this.compatibility.safe;
    this.visualHost.hidden = !visual;
    this.toolbarHost.hidden = !visual;
    this.sourceHost.hidden = visual;
    this.textarea.hidden = visual;

    if (focus) {
      if (visual) {
        this.editor.commands.focus();
      } else {
        this.textarea.focus();
      }
    }
  }

  setCompatibility(result) {
    this.compatibility = result;
    if (result.safe) {
      this.message.hidden = true;
      this.messageText.textContent = "";
      this.visualButton.disabled = !this.editor;
      return;
    }

    this.visualButton.disabled = true;
    this.showMessage(describeCompatibility(result));
  }

  showMessage(text, { allowRecheck = true } = {}) {
    this.messageText.textContent = text;
    this.recheckButton.hidden = !allowRecheck;
    this.message.hidden = false;
  }

  scheduleSourceRefresh() {
    this.window.clearTimeout(this.sourceRefreshTimer);
    this.sourceRefreshTimer = this.window.setTimeout(
      () => this.refreshFromTextarea(),
      this.config.sourceRefreshDelay,
    );
  }

  refreshFromTextarea({ explicit = false } = {}) {
    this.window.clearTimeout(this.sourceRefreshTimer);
    const markdown = this.textarea.value;
    const staticResult = scanMarkdownCompatibility(markdown);

    if (!staticResult.safe) {
      this.setCompatibility(staticResult);
      if (this.mode === "visual") this.setMode("source");
      this.updateStatus();
      return false;
    }

    if (!this.editor) {
      const initialized = this.initializeVisualEditor(markdown);
      this.setMode(initialized && explicit ? "visual" : "source");
      this.updateStatus();
      return initialized;
    }

    const roundTrip = checkMarkdownRoundTrip(this.editor, markdown);
    if (!roundTrip.safe) {
      this.setCompatibility(roundTrip);
      if (this.mode === "visual") this.setMode("source");
      this.updateStatus();
      return false;
    }

    try {
      this.editor.commands.setContent(markdown, {
        contentType: "markdown",
        emitUpdate: false,
        errorOnInvalidContent: true,
      });
      this.visualSyncPending = false;
      this.setCompatibility({ safe: true, reasons: [] });
      this.visualButton.disabled = false;
      if (explicit) this.setMode("visual");
      this.updateStatus();
      return true;
    } catch (error) {
      this.setCompatibility({
        safe: false,
        reasons: [
          {
            code: "parse-error",
            label: "Markdown parse error",
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
      });
      if (this.mode === "visual") this.setMode("source");
      return false;
    }
  }

  updateStatus() {
    const count = approximateCharacterCount(this.textarea.value);
    this.status.textContent = `约 ${count.toLocaleString("zh-CN")} 字`;
  }

  attachLifecycleListeners() {
    const signal = this.abortController.signal;

    this.textarea.addEventListener(
      "input",
      () => {
        if (this.internalTextareaSync) return;
        this.updateStatus();
        this.scheduleSourceRefresh();
      },
      { signal },
    );

    this.form.addEventListener(
      "submit",
      (event) => this.flushVisualToTextarea(event),
      { capture: true, signal },
    );

    this.document.addEventListener(
      "click",
      (event) => {
        const restoreControl =
          event.target instanceof Element
            ? event.target.closest("#restore-draft")
            : null;
        if (restoreControl) {
          this.window.setTimeout(() => this.refreshFromTextarea(), 0);
        }

        if (isBearEditorAction(event.target, this.form)) {
          this.flushVisualToTextarea(event);
        }
      },
      { capture: true, signal },
    );

    this.document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && this.shell.classList.contains("sn-editor--fullscreen")) {
          this.toggleFullscreen(false);
          return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          this.flushVisualToTextarea(event);
        }
      },
      { capture: true, signal },
    );

    const viewport = this.window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", () => this.queueViewportHint(), {
        signal,
      });
      viewport.addEventListener("scroll", () => this.queueViewportHint(), {
        signal,
      });
    }
    this.window.addEventListener("orientationchange", () => this.queueViewportHint(), {
      signal,
    });
  }

  queueViewportHint() {
    if (this.viewportFrame) return;
    this.viewportFrame = this.window.requestAnimationFrame(() => {
      this.viewportFrame = null;
      this.updateViewportHint();
    });
  }

  updateViewportHint() {
    const viewport = this.window.visualViewport;
    const height = viewport?.height;
    const valid =
      Number.isFinite(height) &&
      height >= 240 &&
      height <= this.window.innerHeight * 1.15;

    if (!valid) {
      this.shell.dataset.viewportMode = "fallback";
      this.shell.style.removeProperty("--sn-editor-viewport-height");
      return;
    }

    this.shell.dataset.viewportMode = "visual";
    this.shell.style.setProperty(
      "--sn-editor-viewport-height",
      `${Math.round(height)}px`,
    );
  }

  toggleFullscreen(force) {
    const active =
      typeof force === "boolean"
        ? force
        : !this.shell.classList.contains("sn-editor--fullscreen");
    this.shell.classList.toggle("sn-editor--fullscreen", active);
    this.fullscreenButton.setAttribute("aria-pressed", String(active));
    this.fullscreenButton.textContent = active ? "退出全屏" : "全屏";
    if (active) this.queueViewportHint();
  }

  showNativeFallbackNotice() {
    const notice = this.document.createElement("p");
    notice.className = "sn-editor-native-notice";
    notice.textContent =
      "Sidenotes Visual 编辑器未能启动；当前仍是 Bear 原生 Markdown 编辑器。";
    this.textarea.insertAdjacentElement("afterend", notice);
  }

  rollback() {
    this.window.clearTimeout(this.sourceRefreshTimer);
    if (this.viewportFrame) {
      this.window.cancelAnimationFrame(this.viewportFrame);
      this.viewportFrame = null;
    }
    this.abortController.abort();
    this.destroyVisualEditor();

    if (this.marker?.parentNode) {
      this.marker.parentNode.insertBefore(this.textarea, this.marker);
    }
    this.shell?.remove();
    this.marker?.remove();
    this.restoreConflictingEnhancements();

    this.textarea.className = this.originalTextareaState.className;
    this.textarea.hidden = this.originalTextareaState.hidden;
    if (this.originalTextareaState.ariaHidden === null) {
      this.textarea.removeAttribute("aria-hidden");
    } else {
      this.textarea.setAttribute(
        "aria-hidden",
        this.originalTextareaState.ariaHidden,
      );
    }
    delete this.form.dataset.snEditorMounted;
  }

  destroy() {
    this.flushVisualToTextarea();
    this.rollback();
  }
}
