# AGENTS.md

This file is for future Codex / agent sessions working on this repository. The
README explains how to use the project; this file records maintenance decisions,
constraints, and the reasoning that should guide future edits.

## Project Context

This repo manages public custom assets for three Bear Blog sites:

- `sidenotes.cc`
- `daily.sidenotes.cc`
- `tt.sidenotes.cc`

The GitHub repository is public:

- `https://github.com/Cococolins/sidenotes-blog-assets`

Bear Blog itself is not a build system. It only accepts pasted Custom CSS,
Header Injection, and Footer Script Injection. This repo exists so the source can
be maintained as smaller files, then built into CDN-linked assets and snippets.

## Bear Blog Integration Decisions

- Bear Blog Custom CSS should contain the generated `@import` snippet from
  `dist/snippets/<site>-custom-css.css`.
- Do not leave Bear Blog Custom CSS empty. If it is empty, Bear re-injects its
  default theme CSS after Header Injection, overriding the repo theme's root
  variables, fonts, and link colors.
- Header Injection should contain the generated preload snippet from
  `dist/snippets/<site>-header.html`.
- Footer Script Injection should contain the generated script snippet from
  `dist/snippets/<site>-footer.html`.
- Header snippets intentionally use font `preload` links. The preload URLs must
  match the `@font-face` URLs in the generated CSS, including `crossorigin`, so
  browsers can reuse the request instead of downloading the same font again.
- Do not load the site stylesheet from Header Injection. Bear's default
  `<style data-name="default">` appears after Header Injection, so a stylesheet
  loaded there loses the cascade for equal-specificity base rules. The `@import`
  in Custom CSS keeps the CDN-managed stylesheet at Bear's Custom CSS position.
- The generated CDN URLs use jsDelivr with `@latest` by default. This is
  convenient, but can lag because of CDN or browser caching. For exact rollback
  or a cautious release, use a fixed tag like `v0.2.4`.
- Header and footer snippets use `.html` because they are HTML fragments, even
  when the fragment contains CSS or JavaScript references.

## Source Of Truth

Edit source files under `src/`. Do not hand-edit generated files under `dist/`.

Generated `dist/` files are committed because Bear Blog loads them through the
GitHub CDN. If `src/` changes, run the build so `dist/` changes with it.

Migration baselines live here:

- `Archive/Current/`: current manual files from before the migration.
- `Archive/`: older hand-managed versions for diffing and archaeology.
- `snapshots/2026-06-11/`: live site snapshots captured during migration.

Do not delete Archive or snapshot files just because they look old. They are the
evidence trail for future comparisons.

## CSS Structure

CSS is organized by sharing scope, not by visual category alone.

Shared across all three sites:

- `src/shared/css/all/`

Shared by `sidenotes.cc` and `tt.sidenotes.cc`:

- `src/shared/css/sidenotes-tt/`

Shared by `daily.sidenotes.cc` and `tt.sidenotes.cc`:

- `src/shared/css/daily-tt/`

Site-only CSS:

- `src/sites/sidenotes/css/`
- `src/sites/daily/css/`
- `src/sites/tt/css/`

Before moving a rule into shared CSS, check whether it is truly shared behavior
or an intentional site-specific override. During the migration, some image
layout fixes from the main site were judged to be forgotten bugfixes for the
sub-sites and were promoted to `src/shared/css/all/`.

## JavaScript Structure

Common behavior lives in:

- `src/shared/js/blog-app.js`

Site differences live in:

- `src/sites/sidenotes/config.json`
- `src/sites/daily/config.json`
- `src/sites/tt/config.json`

The known site-specific JS differences are small:

- the tagline appended to the page identity text
- the selectors used for exact-time formatting

When adding a new per-site difference, prefer adding a config field before
forking the shared JS. Fork the JS only if the behavior is genuinely different
and cannot stay understandable as configuration.

## Build And Release

Common commands:

```bash
npm run build
npm run verify
npm run release:patch -- "Release note"
npm run release:minor -- "Release note"
npm run release:major -- "Release note"
```

`release:*` runs the build and verification, commits the result, tags it, and
pushes to GitHub.

Archive diff helpers:

```bash
npm run diff:archive -- css 20 34
npm run diff:archive -- footer 17 20
```

## Verification Expectations

Before finishing meaningful changes, run:

```bash
npm run verify
```

For CSS changes, verify the intended generated site CSS in `dist/<site>.css`.
For JS changes, verify `dist/<site>.js` has resolved site config and still
contains the expected site-specific selectors / tagline.

If a change affects CDN snippets or release behavior, inspect the generated
files in `dist/snippets/` as well.

## Editing Principles

- Keep changes scoped to the requested behavior.
- Preserve existing CSS ordering unless there is a clear reason to move rules.
- Prefer shared modules only when the shared intent is real.
- Keep site-specific overrides explicit and easy to find.
- Avoid unrelated cleanup in Archive, snapshots, or generated files.
- If live Bear Blog behavior is uncertain, fetch or inspect the live site rather
  than guessing from local files.
