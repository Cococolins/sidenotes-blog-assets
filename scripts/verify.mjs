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
  ["sidenotes generated header equals source", "dist/sidenotes.header.html", "src/header.html"],
  ["daily generated header equals source", "dist/daily.header.html", "src/header.html"],
  ["tt generated header equals source", "dist/tt.header.html", "src/header.html"],
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
  const manifest = JSON.parse(read(`src/sites/${site}/manifest.json`));
  const config = JSON.parse(read(`src/sites/${site}/config.json`));

  const requiredSharedCss = [
    "src/shared/css/all/01-tokens.css",
    "src/shared/css/all/02-base.css",
    "src/shared/css/all/14-article-directory.css",
  ];
  for (const sharedCss of requiredSharedCss) {
    if (!manifest.css.includes(sharedCss)) {
      failed = true;
      console.error(`FAIL ${site} manifest includes shared CSS ${sharedCss}`);
    } else {
      console.log(`PASS ${site} manifest includes shared CSS ${sharedCss}`);
    }
  }

  if (!css.includes("--visited-color: #5a6e60")) {
    failed = true;
    console.error(`FAIL ${site} CSS keeps unified visited link color`);
  } else {
    console.log(`PASS ${site} CSS keeps unified visited link color`);
  }

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

  if (!config.articleDirectory?.enabled) {
    failed = true;
    console.error(`FAIL ${site} enables article directory`);
  } else {
    console.log(`PASS ${site} enables article directory`);
  }

  const directoryJsChecks = [
    ["initializes article directory", "initArticleDirectory"],
    ["limits directory to post pages", "document.body.classList.contains('post')"],
    ["builds directory from h2 and h3", "main.querySelectorAll('h2, h3')"],
    ["supports mobile directory dialog", "article-directory__toggle"],
    ["tracks active article heading", "aria-current"],
  ];
  for (const [label, needle] of directoryJsChecks) {
    if (!js.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} external JS ${label}`);
    } else {
      console.log(`PASS ${site} external JS ${label}`);
    }
  }

  const bilibiliPauseChecks = [
    ["initializes Bilibili background pause", "initBilibiliBackgroundPause"],
    ["targets Bilibili embed players", "player.bilibili.com/player.html"],
    ["stops Bilibili when the page is hidden", "if (document.hidden) stopPlayers()"],
    ["destroys the active Bilibili playback context", "iframe.replaceWith(iframe.cloneNode(true))"],
  ];
  for (const [label, needle] of bilibiliPauseChecks) {
    if (!js.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} external JS ${label}`);
    } else {
      console.log(`PASS ${site} external JS ${label}`);
    }
  }

  const directoryCssChecks = [
    ["contains article directory styles", ".article-directory__panel"],
    ["contains desktop hidden directory breakpoint", "@media screen and (min-width: 1180px)"],
    ["supports keyboard directory expansion", ".article-directory:focus-within"],
    ["supports reduced directory motion", "@media (prefers-reduced-motion: reduce)"],
  ];
  for (const [label, needle] of directoryCssChecks) {
    if (!css.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} CSS ${label}`);
    } else {
      console.log(`PASS ${site} CSS ${label}`);
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
    ["mobile figure caption width rule", "max-width: calc(100% - 76px);"],
  ];
  for (const [label, needle] of imageFixes) {
    if (!css.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} CSS includes shared ${label}`);
    } else {
      console.log(`PASS ${site} CSS includes shared ${label}`);
    }
  }

  const notesOrientationJsChecks = [
    ["classifies Notes images after dimensions are available", "updateNotesImageOrientation"],
    ["marks portrait Notes images", "notes-image--portrait"],
    ["compares intrinsic image dimensions", "img.naturalHeight > img.naturalWidth"],
  ];
  for (const [label, needle] of notesOrientationJsChecks) {
    if (!js.includes(needle)) {
      failed = true;
      console.error(`FAIL ${site} external JS ${label}`);
    } else {
      console.log(`PASS ${site} external JS ${label}`);
    }
  }

  if (site !== "daily") {
    const notesOrientationCssChecks = [
      ["keeps single non-portrait Notes images uncropped", "aspect-ratio: auto;"],
      ["crops single portrait Notes images to a square", ".notes-image--portrait"],
    ];
    for (const [label, needle] of notesOrientationCssChecks) {
      if (!css.includes(needle)) {
        failed = true;
        console.error(`FAIL ${site} CSS ${label}`);
      } else {
        console.log(`PASS ${site} CSS ${label}`);
      }
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
