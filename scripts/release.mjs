import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const [bump = "patch", ...messageParts] = process.argv.slice(2);
const packagePath = join(root, "package.json");
const changelogPath = join(root, "CHANGELOG.md");
const write = (file, text) => writeFileSync(join(root, file), text);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stderr);
      process.stdout.write(result.stdout);
    }
    process.exit(result.status ?? 1);
  }

  return options.capture ? result.stdout.trim() : "";
}

function nextVersion(current, mode) {
  if (/^\d+\.\d+\.\d+$/.test(mode)) return mode;

  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unsupported current version: ${current}`);
  }

  const [major, minor, patch] = parts;
  if (mode === "patch") return `${major}.${minor}.${patch + 1}`;
  if (mode === "minor") return `${major}.${minor + 1}.0`;
  if (mode === "major") return `${major + 1}.0.0`;

  throw new Error(`Unknown release bump: ${mode}. Use patch, minor, major, or an explicit x.y.z version.`);
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function archiveUnreleased(changelog, version, releaseDate) {
  const marker = "## [Unreleased]";
  const markerIndex = changelog.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Missing ${marker} in CHANGELOG.md`);
  }

  const notesStart = markerIndex + marker.length;
  const nextHeadingOffset = changelog.slice(notesStart).search(/\n## \[/);
  const notesEnd = nextHeadingOffset === -1
    ? changelog.length
    : notesStart + nextHeadingOffset;
  const notes = changelog.slice(notesStart, notesEnd).trim();

  if (!notes) {
    throw new Error("CHANGELOG.md [Unreleased] is empty. Add release notes before publishing.");
  }

  const prefix = changelog.slice(0, notesStart);
  const previousReleases = changelog.slice(notesEnd).replace(/^\s+/, "");
  const archived = [
    prefix,
    "",
    `## [${version}] - ${releaseDate}`,
    "",
    notes,
    "",
    previousReleases,
  ].join("\n").trimEnd();

  return `${archived}\n`;
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const version = nextVersion(packageJson.version, bump);
const tag = `v${version}`;
const commitMessage = messageParts.join(" ").trim() || `Release ${tag}`;

const existingTag = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], {
  cwd: root,
  stdio: "ignore",
});
if (existingTag.status === 0) {
  console.error(`Tag already exists: ${tag}`);
  process.exit(1);
}

const changelog = readFileSync(changelogPath, "utf8");
const nextChangelog = archiveUnreleased(changelog, version, localDate());

packageJson.version = version;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
write("CHANGELOG.md", nextChangelog);

run("npm", ["run", "build"]);
run("npm", ["run", "verify"]);
run("node", ["--check", "dist/sidenotes.js"]);
run("node", ["--check", "dist/daily.js"]);
run("node", ["--check", "dist/tt.js"]);

run("git", ["add", "."]);
run("git", ["commit", "-m", commitMessage]);
run("git", ["tag", tag]);
run("git", ["push", "origin", "main"]);
run("git", ["push", "origin", tag]);

console.log(`Released ${tag}`);
