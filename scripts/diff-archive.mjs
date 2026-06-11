import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const [kind = "css", fromVersion, toVersion] = process.argv.slice(2);

const usage = `Usage:
  npm run diff:archive -- css 20 34
  npm run diff:archive -- footer 17 20
  npm run diff:archive -- header 1 3
`;

if (!fromVersion || !toVersion) {
  console.error(usage);
  process.exit(1);
}

function versionLabel(value) {
  return String(value).replace(/^v/i, "");
}

function archivePath(type, version) {
  const v = versionLabel(version);
  if (type === "css") return `Archive/1_Sidenotes_v${v}.css`;
  if (type === "footer") {
    const lower = `Archive/2_Sidenotes_footer_injection_v${v}.js`;
    const upper = `Archive/2_Sidenotes_footer_injection_V${v}.js`;
    return existsSync(join(root, lower)) ? lower : upper;
  }
  if (type === "header") return `Archive/3_Sidenotes_header_injection_V${v}.js`;
  throw new Error(`Unknown archive kind: ${type}`);
}

const fromPath = archivePath(kind, fromVersion);
const toPath = archivePath(kind, toVersion);

for (const file of [fromPath, toPath]) {
  if (!existsSync(join(root, file))) {
    console.error(`Missing archive file: ${file}`);
    process.exit(1);
  }
}

const result = spawnSync("git", ["diff", "--no-index", "--", fromPath, toPath], {
  cwd: root,
  stdio: "inherit",
});

if (result.status !== 0 && result.status !== 1) {
  process.exit(result.status ?? 1);
}
