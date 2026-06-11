import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cdnVersion = process.env.CDN_VERSION || "latest";
const cdnBase = `https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@${cdnVersion}`;

const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";
const read = (file) => normalize(readFileSync(join(root, file), "utf8"));
const sha = (text) => createHash("sha256").update(normalize(text)).digest("hex").slice(0, 12);

const checks = [
  ["sidenotes CSS equals current archived v34", "dist/sidenotes.css", "Archive/Current/1_Sidenotes_theme_css_v34.css"],
  ["sidenotes header equals current archived V3", "dist/sidenotes.header.html", "Archive/Current/3_Sidenotes_header_injection_V3.js"],
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
  const css = read(`dist/${site}.css`);
  const customCss = read(`dist/${site}.custom-css.css`);
  const headerExternal = read(`dist/${site}.header.external.html`);
  const footerExternal = read(`dist/${site}.footer.external.html`);
  const snippetCustomCss = read(`dist/snippets/${site}-custom-css.css`);
  const snippetHeader = read(`dist/snippets/${site}-header.html`);
  const snippetFooter = read(`dist/snippets/${site}-footer.html`);
  const config = JSON.parse(read(`src/sites/${site}/config.json`));

  if (!js.includes(JSON.stringify(config.tagline))) {
    failed = true;
    console.error(`FAIL ${site} external JS includes configured tagline`);
  } else {
    console.log(`PASS ${site} external JS includes configured tagline`);
  }

  if (js.includes("__SITE_CONFIG__")) {
    failed = true;
    console.error(`FAIL ${site} external JS has unresolved SITE_CONFIG placeholder`);
  } else {
    console.log(`PASS ${site} external JS has resolved SITE_CONFIG`);
  }

  for (const selector of config.exactTimeSelectors) {
    if (!js.includes(JSON.stringify(selector))) {
      failed = true;
      console.error(`FAIL ${site} external JS includes exact-time selector ${selector}`);
    } else {
      console.log(`PASS ${site} external JS includes exact-time selector ${selector}`);
    }
  }

  if (!js.includes("BlogApp.init();") || !js.includes("Plugin name: Editor shortcut")) {
    failed = true;
    console.error(`FAIL ${site} external JS contains expected custom scripts`);
  } else {
    console.log(`PASS ${site} external JS contains expected custom scripts (${sha(js)})`);
  }

  const imageFixes = [
    ["hero portrait image rule", "img.hero-portrait"],
    ["consecutive image paragraph rule", "7B. 多段图片连排"],
    ["figure-after-image spacing rule", "main p:has(> :is(img, a.pswp-gallery__item)) + figure > p:has(> :is(img, a.pswp-gallery__item))"],
  ];
  for (const [label, needle] of imageFixes) {
    if (!css.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} CSS includes shared ${label}`);
    } else {
      console.log(`PASS ${site} CSS includes shared ${label}`);
    }
  }

  const expectedCssUrl = `${cdnBase}/dist/${site}.css`;
  const expectedJsUrl = `${cdnBase}/dist/${site}.js`;
  if (!customCss.includes(expectedCssUrl)) {
    failed = true;
    console.error(`FAIL ${site} custom CSS references ${expectedCssUrl}`);
  } else {
    console.log(`PASS ${site} custom CSS references CDN CSS`);
  }
  if (headerExternal.includes("rel=\"stylesheet\"")) {
    failed = true;
    console.error(`FAIL ${site} external header should not load stylesheet before Bear default CSS`);
  } else {
    console.log(`PASS ${site} external header avoids early stylesheet load`);
  }
  if (!footerExternal.includes(expectedJsUrl)) {
    failed = true;
    console.error(`FAIL ${site} external footer references ${expectedJsUrl}`);
  } else {
    console.log(`PASS ${site} external footer references CDN JS`);
  }

  if (snippetCustomCss !== customCss || snippetHeader !== headerExternal || snippetFooter !== footerExternal) {
    failed = true;
    console.error(`FAIL ${site} snippets mirror external compatibility files`);
  } else {
    console.log(`PASS ${site} snippets mirror external compatibility files`);
  }
}

if (failed) process.exit(1);
