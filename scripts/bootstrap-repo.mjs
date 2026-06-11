import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const snapshotDate = "2026-06-11";

const ensureDir = (dir) => mkdirSync(dir, { recursive: true });
const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";
const sha = (text) => createHash("sha256").update(normalize(text)).digest("hex");
const write = (file, text) => {
  ensureDir(join(root, file, ".."));
  writeFileSync(join(root, file), normalize(text));
};
const writeRaw = (file, text) => {
  ensureDir(join(root, file, ".."));
  writeFileSync(join(root, file), text.replace(/\r\n/g, "\n"));
};

function readRequired(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required input: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function extractStyle(html) {
  const match = html.match(/<style\b[^>]*data-name=["']default["'][^>]*>([\s\S]*?)<\/style>/i);
  if (!match) throw new Error("Cannot find Bear default style block.");
  return match[1];
}

function extractCustomFooter(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attrs: match[1], body: match[2] }));
  const moduleScript = scripts.find((script) => /type=["']module["']/.test(script.attrs));
  const editorShortcut = scripts.find((script) => /Plugin name: Editor shortcut/.test(script.body));
  if (!moduleScript) throw new Error("Cannot find custom module footer script.");
  if (!editorShortcut) throw new Error("Cannot find editor shortcut footer script.");

  return [
    '<script type="module">',
    moduleScript.body.trim(),
    "</script>",
    '<script>',
    editorShortcut.body.trim(),
    "</script>",
  ].join("\n");
}

function splitCssSections(css) {
  const normalized = normalize(css).trimEnd();
  const marker = /^\/\* ={10,}\n\s+[0-9]+[A-Z]?\.\s[\s\S]*?={10,} \*\/$/gm;
  const matches = [...normalized.matchAll(marker)];
  if (matches.length === 0) throw new Error("No CSS section markers found.");

  const sectionNames = {
    "0": ["00", "vendor-photoswipe"],
    "1": ["01", "tokens"],
    "2": ["02", "base"],
    "3": ["03", "layout"],
    "4": ["04", "navigation"],
    "5": ["05", "post-list"],
    "6": ["06", "media"],
    "7": ["07", "image-grid"],
    "7B": ["07b", "consecutive-photo-paragraphs"],
    "8": ["08", "notes-feed"],
    "9": ["09", "gallery-feed"],
    "10": ["10", "plugins"],
    "11": ["11", "details"],
    "12": ["12", "responsive"],
    "13": ["13", "enhancements"],
  };

  const sections = matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
    const block = normalized.slice(start, end);
    const titleLine = match[0].split("\n")[1]?.trim() ?? `${index}`;
    const numbered = titleLine.match(/^([0-9]+[A-Z]?)\.\s*(.+)$/);
    const key = numbered ? numbered[1] : String(index);
    const [number, title] = sectionNames[key] ?? [String(index).padStart(2, "0"), "section"];
    return {
      file: `src/css/${number}-${title}.css`,
      text: block,
    };
  });

  return sections;
}

function siteManifest(site, cssEntries, footerEntry) {
  return JSON.stringify({
    css: cssEntries,
    header: "src/header.html",
    footer: footerEntry,
  }, null, 2);
}

ensureDir("snapshots");
ensureDir(`snapshots/${snapshotDate}`);
ensureDir("src/css");
ensureDir("src/sites");
ensureDir("dist");

const localMainCss = readRequired("Archive/Current/1_Sidenotes_theme_css_v34.css");
const localHeader = readRequired("Archive/Current/3_Sidenotes_header_injection_V3.js");
const localFooter = readRequired("Archive/Current/2_Sidenotes_footer_injection_V20.js");

const liveInputs = {
  sidenotes: "/tmp/sidenotes-live.html",
  daily: "/tmp/daily-live.html",
  tt: "/tmp/tt-live.html",
};

const siteCssEntries = {};
for (const [site, tmpPath] of Object.entries(liveInputs)) {
  const html = readRequired(tmpPath);
  const css = extractStyle(html);
  const footer = extractCustomFooter(html);

  write(`snapshots/${snapshotDate}/${site}.html`, html);
  write(`snapshots/${snapshotDate}/${site}.css`, css);
  write(`snapshots/${snapshotDate}/${site}.footer.html`, footer);

  ensureDir(`src/sites/${site}`);
  write(`src/sites/${site}/footer.html`, footer);

  if (site === "sidenotes") {
    const sections = splitCssSections(localMainCss);
    for (const section of sections) writeRaw(section.file, section.text);
    siteCssEntries[site] = sections.map((section) => section.file);
  } else {
    write(`src/sites/${site}/legacy.css`, css);
    siteCssEntries[site] = [`src/sites/${site}/legacy.css`];
  }

  write(
    `src/sites/${site}/manifest.json`,
    siteManifest(site, siteCssEntries[site], `src/sites/${site}/footer.html`)
  );
}

write("src/header.html", localHeader);
write("src/sites/sidenotes/footer.html", localFooter);
write(
  "snapshots/README.md",
  `# Live snapshots

These files preserve the CSS, footer injection, and rendered HTML captured from the live Bear Blog sites.

- Captured: ${snapshotDate}
- Sites: sidenotes.cc, daily.sidenotes.cc, tt.sidenotes.cc
- Purpose: compare future changes against the current production state before publishing.
`
);

const report = {
  localMainCssSha: sha(localMainCss),
  localHeaderSha: sha(localHeader),
  localFooterSha: sha(localFooter),
  generatedFiles: [
    "src/header.html",
    ...siteCssEntries.sidenotes,
    ...Object.keys(liveInputs).flatMap((site) => [
      `src/sites/${site}/manifest.json`,
      `src/sites/${site}/footer.html`,
      site === "sidenotes" ? null : `src/sites/${site}/legacy.css`,
      `snapshots/${snapshotDate}/${site}.html`,
      `snapshots/${snapshotDate}/${site}.css`,
      `snapshots/${snapshotDate}/${site}.footer.html`,
    ]).filter(Boolean),
  ],
};

write("snapshots/bootstrap-report.json", JSON.stringify(report, null, 2));

console.log(`Bootstrapped ${Object.keys(liveInputs).length} site snapshots from live HTML.`);
console.log(`Split sidenotes CSS into ${siteCssEntries.sidenotes.length} modules.`);
