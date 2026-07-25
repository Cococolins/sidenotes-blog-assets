import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build, transform } from "esbuild";

const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd() + "\n";

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, normalize(text));
}

function integrity(text) {
  return `sha384-${createHash("sha384").update(normalize(text)).digest("base64")}`;
}

export async function buildDashboard({ root = process.cwd() } = {}) {
  const packageJson = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const assetVersion =
    process.env.DASHBOARD_VERSION || `v${packageJson.version}`;
  const cdnVersion =
    process.env.DASHBOARD_CDN_VERSION || assetVersion;
  const cdnBase =
    process.env.DASHBOARD_CDN_BASE ||
    `https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@${cdnVersion}`;

  const jsResult = await build({
    entryPoints: [join(root, "src/dashboard/sidenotes-editor/index.js")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: ["safari16", "chrome109", "firefox115"],
    minify: true,
    charset: "utf8",
    legalComments: "eof",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    banner: {
      js: `/* Sidenotes Dashboard Editor ${assetVersion} */`,
    },
  });

  const sourceCss = readFileSync(
    join(root, "src/dashboard/sidenotes-editor/editor.css"),
    "utf8",
  );
  const cssResult = await transform(sourceCss, {
    loader: "css",
    minify: true,
    target: ["safari16", "chrome109", "firefox115"],
  });

  const js = jsResult.outputFiles[0].text;
  const css = `/* Sidenotes Dashboard Editor ${assetVersion} */\n${cssResult.code}`;
  const jsPath = join(root, "dist/dashboard/sidenotes-editor.js");
  const cssPath = join(root, "dist/dashboard/sidenotes-editor.css");

  write(jsPath, js);
  write(cssPath, css);

  const snippet = `<!-- Sidenotes Dashboard Editor ${assetVersion}; CDN revision ${cdnVersion}; Account → Customise dashboard → Dashboard Footer content -->
<link
  rel="stylesheet"
  href="${cdnBase}/dist/dashboard/sidenotes-editor.css"
  integrity="${integrity(css)}"
  crossorigin="anonymous"
>
<script
  type="module"
  src="${cdnBase}/dist/dashboard/sidenotes-editor.js"
  integrity="${integrity(js)}"
  crossorigin="anonymous"
></script>`;

  write(
    join(root, "dist/snippets/sidenotes-dashboard-footer.html"),
    snippet,
  );

  console.log(
    `Built dashboard editor: dist/dashboard/sidenotes-editor.js, CSS and fixed-version snippet (${cdnVersion})`,
  );
}

const entryFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === entryFile) {
  await buildDashboard();
}
