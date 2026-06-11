import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requestedSites = process.argv.slice(2);
const sites = requestedSites.length > 0 ? requestedSites : ["sidenotes", "daily", "tt"];
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const cdnVersion = process.env.CDN_VERSION || "latest";
const cdnBase = process.env.CDN_BASE || `https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@${cdnVersion}`;

const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";
const read = (file) => readFileSync(join(root, file), "utf8");
const write = (file, text) => {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), normalize(text));
};

function extractScriptBodies(footerHtml) {
  const scripts = [...footerHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attrs: match[1], body: match[2].trim() }));
  const moduleScript = scripts.find((script) => /type=["']module["']/.test(script.attrs));
  if (!moduleScript) throw new Error("Footer injection is missing a module script.");

  const inlineScripts = scripts.filter((script) => script !== moduleScript);
  return [moduleScript.body, ...inlineScripts.map((script) => script.body)].join("\n\n");
}

function externalHeader(headerHtml, site) {
  return `${headerHtml.trim()}\n<link rel="stylesheet" href="${cdnBase}/dist/${site}.css">`;
}

function externalFooter(site) {
  return `<script type="module" src="${cdnBase}/dist/${site}.js"></script>`;
}

mkdirSync(join(root, "dist"), { recursive: true });

for (const site of sites) {
  const manifestPath = `src/sites/${site}/manifest.json`;
  if (!existsSync(join(root, manifestPath))) {
    throw new Error(`Unknown site manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(read(manifestPath));
  const css = manifest.css.map((file) => read(file)).join("");
  const headerHtml = read(manifest.header);
  const footerHtml = read(manifest.footer);
  const moduleJs = extractScriptBodies(footerHtml);

  write(`dist/${site}.css`, css);
  write(`dist/${site}.js`, moduleJs);
  write(`dist/${site}.header.html`, headerHtml);
  write(`dist/${site}.footer.html`, footerHtml);
  write(`dist/${site}.header.external.html`, externalHeader(headerHtml, site));
  write(`dist/${site}.footer.external.html`, externalFooter(site));

  console.log(`Built ${site}: dist/${site}.css, dist/${site}.js, inline and external snippets`);
}
