import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requestedSites = process.argv.slice(2);
const sites = requestedSites.length > 0 ? requestedSites : ["sidenotes", "daily", "tt"];

const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";
const read = (file) => readFileSync(join(root, file), "utf8");
const write = (file, text) => {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), normalize(text));
};

mkdirSync(join(root, "dist"), { recursive: true });

for (const site of sites) {
  const manifestPath = `src/sites/${site}/manifest.json`;
  if (!existsSync(join(root, manifestPath))) {
    throw new Error(`Unknown site manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(read(manifestPath));
  const css = manifest.css.map((file) => read(file)).join("");

  write(`dist/${site}.css`, css);
  write(`dist/${site}.header.html`, read(manifest.header));
  write(`dist/${site}.footer.html`, read(manifest.footer));

  console.log(`Built ${site}: dist/${site}.css, dist/${site}.header.html, dist/${site}.footer.html`);
}
