import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const [bump = "patch", ...messageParts] = process.argv.slice(2);
const packagePath = join(root, "package.json");
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

packageJson.version = version;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);

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
