import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { Editor } from "@tiptap/core";
import { dashboardEditorConfig, resolveDashboardTarget } from "../src/dashboard/sidenotes-editor/config.js";
import { createEditorExtensions } from "../src/dashboard/sidenotes-editor/create-editor.js";
import {
  checkMarkdownRoundTrip,
  scanMarkdownCompatibility,
} from "../src/dashboard/sidenotes-editor/markdown-compatibility.js";

const root = process.cwd();
const fixture = (name) =>
  readFileSync(join(root, "dashboard/fixtures/markdown", name), "utf8");
const lifecycleSource = readFileSync(
  join(root, "src/dashboard/sidenotes-editor/lifecycle.js"),
  "utf8",
);

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function roundTrip(markdown) {
  const editor = new Editor({
    extensions: createEditorExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  const result = checkMarkdownRoundTrip(editor, markdown);
  editor.destroy();
  return result;
}

test("pilot only enables the colin post editor path", () => {
  const storage = memoryStorage();
  const enabled = resolveDashboardTarget({
    pathname: "/colin/dashboard/posts/new/",
    search: "?sn-editor=1",
    storage,
  });
  assert.equal(enabled.eligible, true);
  assert.equal(enabled.blogId, "colin");

  const stored = resolveDashboardTarget({
    pathname: "/colin/dashboard/posts/123/",
    storage,
  });
  assert.equal(stored.eligible, true);
  assert.equal(stored.pilot, "stored");

  for (const blogId of dashboardEditorConfig.disabledBlogIds) {
    const disabled = resolveDashboardTarget({
      pathname: `/${blogId}/dashboard/posts/new/`,
      search: "?sn-editor=1",
      storage,
    });
    assert.equal(disabled.eligible, false);
  }

  const wrongPage = resolveDashboardTarget({
    pathname: "/colin/dashboard/settings/",
    search: "?sn-editor=1",
    storage,
  });
  assert.equal(wrongPage.eligible, false);
});

test("sn-editor=0 clears the stored pilot preference", () => {
  const storage = memoryStorage();
  resolveDashboardTarget({
    pathname: "/colin/dashboard/posts/new/",
    search: "?sn-editor=1",
    storage,
  });
  const disabled = resolveDashboardTarget({
    pathname: "/colin/dashboard/posts/new/",
    search: "?sn-editor=0",
    storage,
  });
  assert.equal(disabled.eligible, false);

  const subsequent = resolveDashboardTarget({
    pathname: "/colin/dashboard/posts/new/",
    storage,
  });
  assert.equal(subsequent.eligible, false);
});

test("safe Markdown passes static and structural round-trip gates", () => {
  for (const name of ["safe-basic.md", "safe-image.md"]) {
    const markdown = fixture(name);
    assert.equal(scanMarkdownCompatibility(markdown).safe, true, name);
    assert.equal(roundTrip(markdown).safe, true, name);
  }
});

test("known Bear extensions fall back to Source mode", () => {
  const cases = [
    ["unsupported-bear-directive.md", "bear-template"],
    ["unsupported-html.md", "raw-html"],
    ["unsupported-latex.md", "latex"],
    ["unsupported-footnote.md", "footnote"],
    ["unsupported-tab-link.md", "tab-link"],
    ["unsupported-inline-extensions.md", "highlight"],
    ["unsupported-inline-extensions.md", "subscript"],
    ["unsupported-inline-extensions.md", "superscript"],
    ["unsupported-table.md", "table"],
    ["unsupported-task-list.md", "task-list"],
    ["unsupported-comment.md", "html-comment"],
    ["unsupported-admonition.md", "admonition"],
  ];

  for (const [name, code] of cases) {
    const result = scanMarkdownCompatibility(fixture(name));
    assert.equal(result.safe, false, name);
    assert.ok(result.reasons.some((reason) => reason.code === code), name);
  }
});

test("HTML examples inside code do not trigger raw HTML fallback", () => {
  const markdown = "```html\n<details>example</details>\n```\n";
  assert.equal(scanMarkdownCompatibility(markdown).safe, true);
  assert.equal(roundTrip(markdown).safe, true);
});

test("late legacy editor controls remain suspended", () => {
  assert.match(lifecycleSource, /new this\.window\.MutationObserver/);
  assert.match(
    lifecycleSource,
    /this\.suspendConflictingEnhancements\(node\)/,
  );
  assert.match(
    lifecycleSource,
    /this\.conflictingEnhancementObserver\?\.disconnect\(\)/,
  );
});
