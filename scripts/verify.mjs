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
  ["sidenotes header equals current archived V3", "dist/sidenotes.header.html", "Archive/Current/3_Sidenotes_header_injection_V3.js"],
];

const containsChecks = [
  ["sidenotes CSS keeps Noto Serif font face", "dist/sidenotes.css", "font-family: 'Noto Serif'"],
  ["sidenotes CSS keeps custom body font stack", "dist/sidenotes.css", "--font-secondary: \"CJK Dash Fix\", 'Noto Serif'"],
  ["sidenotes CSS keeps green link color", "dist/sidenotes.css", "--link-color: #1f7a4f"],
  ["sidenotes CSS keeps current body text color", "dist/sidenotes.css", "--text-color: #2B3831"],
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

for (const [label, actualPath, needle] of containsChecks) {
  const actual = read(actualPath);
  if (!actual.includes(needle)) {
    failed = true;
    console.error(`FAIL ${label}`);
    console.error(`  Missing: ${needle}`);
  } else {
    console.log(`PASS ${label}`);
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

  if (config.excerptHydrator?.enabled) {
    if (!js.includes('"excerptHydrator"') || !js.includes("initPostExcerpts") || !js.includes("extractPostExcerpt")) {
      failed = true;
      console.error(`FAIL ${site} external JS includes excerpt hydrator`);
    } else {
      console.log(`PASS ${site} external JS includes excerpt hydrator`);
    }

    if (!js.includes("initPostExcerptLinks") || !js.includes("window.location.href = link.href")) {
      failed = true;
      console.error(`FAIL ${site} external JS includes clickable excerpt behavior`);
    } else {
      console.log(`PASS ${site} external JS includes clickable excerpt behavior`);
    }

    if (!js.includes("post-excerpt-link") || !js.includes("excerptLink.href = link.href")) {
      failed = true;
      console.error(`FAIL ${site} external JS wraps hydrated excerpts as one link`);
    } else {
      console.log(`PASS ${site} external JS wraps hydrated excerpts as one link`);
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
    ["consecutive image paragraph rule", "多段图片连排"],
    ["figure-after-image spacing rule", "main p:has(> :is(img, a.pswp-gallery__item)) + figure > p:has(> :is(img, a.pswp-gallery__item))"],
    ["PhotoSwipe anchor line-height rule", "main a.pswp-gallery__item"],
    ["PhotoSwipe list and figure wrapper rule", "main :is(li, figure)>a.pswp-gallery__item"],
  ];
  for (const [label, needle] of imageFixes) {
    if (!css.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} CSS includes shared ${label}`);
    } else {
      console.log(`PASS ${site} CSS includes shared ${label}`);
    }
  }

  const blockquoteFontStack = "--font-blockquote: 'Noto Serif', \"Source Han Serif SC\"";
  if (!css.includes(blockquoteFontStack)) {
    failed = true;
    console.error(`FAIL ${site} CSS keeps Latin before CJK in blockquote font stack`);
  } else {
    console.log(`PASS ${site} CSS keeps Latin before CJK in blockquote font stack`);
  }

  if (site === "daily") {
    const dailyHomeChecks = [
      ["title hover arrow rule", ".homelist ul.blog-posts>li>span + a::after"],
      ["title link excludes PhotoSwipe wrapper", ".homelist ul.blog-posts>li>span + a:not(.pswp-gallery__item)"],
      ["PhotoSwipe home image wrapper rule", ".homelist ul.blog-posts>li>a.pswp-gallery__item"],
      ["whole excerpt link rule", ".homelist ul.blog-posts>li>.post-excerpt-link"],
      ["clickable excerpt cursor rule", ".homelist ul.blog-posts>li>p"],
    ];
    for (const [label, needle] of dailyHomeChecks) {
      if (!css.includes(needle)) {
        failed = true;
        console.error(`FAIL daily CSS includes ${label}`);
      } else {
        console.log(`PASS daily CSS includes ${label}`);
      }
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
