import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const snapshotDate = "2026-06-11";
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const cdnBase = `https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@v${packageJson.version}`;

const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";
const read = (file) => normalize(readFileSync(join(root, file), "utf8"));
const sha = (text) => createHash("sha256").update(normalize(text)).digest("hex").slice(0, 12);

const checks = [
  ["sidenotes CSS equals local v34", "dist/sidenotes.css", "1_Sidenotes_theme_css_v34.css"],
  ["sidenotes header equals local V3", "dist/sidenotes.header.html", "3_Sidenotes_header_injection_V3.js"],
  ["sidenotes footer equals local V20", "dist/sidenotes.footer.html", "2_Sidenotes_footer_injection_V20.js"],
  ["daily CSS equals live snapshot", "dist/daily.css", `snapshots/${snapshotDate}/daily.css`],
  ["daily footer equals live snapshot", "dist/daily.footer.html", `snapshots/${snapshotDate}/daily.footer.html`],
  ["tt CSS equals live snapshot", "dist/tt.css", `snapshots/${snapshotDate}/tt.css`],
  ["tt footer equals live snapshot", "dist/tt.footer.html", `snapshots/${snapshotDate}/tt.footer.html`],
];

let failed = false;

for (const [label, actualPath, expectedPath] of checks) {
  const actual = read(actualPath);
  const expected = read(expectedPath);
  if (actual !== expected) {
    failed = true;
    console.error(`FAIL ${label}`);
    console.error(`  ${actualPath}: ${sha(actual)}`);
    console.error(`  ${expectedPath}: ${sha(expected)}`);
  } else {
    console.log(`PASS ${label} (${sha(actual)})`);
  }
}

for (const site of ["sidenotes", "daily", "tt"]) {
  const js = read(`dist/${site}.js`);
  const headerExternal = read(`dist/${site}.header.external.html`);
  const footerExternal = read(`dist/${site}.footer.external.html`);

  if (!js.includes("BlogApp.init();") || !js.includes("Plugin name: Editor shortcut")) {
    failed = true;
    console.error(`FAIL ${site} external JS contains expected custom scripts`);
  } else {
    console.log(`PASS ${site} external JS contains expected custom scripts (${sha(js)})`);
  }

  const expectedCssUrl = `${cdnBase}/dist/${site}.css`;
  const expectedJsUrl = `${cdnBase}/dist/${site}.js`;
  if (!headerExternal.includes(expectedCssUrl)) {
    failed = true;
    console.error(`FAIL ${site} external header references ${expectedCssUrl}`);
  } else {
    console.log(`PASS ${site} external header references tagged CSS`);
  }
  if (!footerExternal.includes(expectedJsUrl)) {
    failed = true;
    console.error(`FAIL ${site} external footer references ${expectedJsUrl}`);
  } else {
    console.log(`PASS ${site} external footer references tagged JS`);
  }
}

if (failed) process.exit(1);
