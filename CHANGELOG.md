# Changelog

This file records notable changes to the public Bear Blog assets. The Git diff
remains the exact source-level evidence; this changelog preserves intent,
scope, chosen values, and deliberate exceptions for future maintainers.

## [Unreleased]

## [0.2.28] - 2026-07-23

- Added a required changelog workflow for future releases. The release script
  now refuses to publish an empty `[Unreleased]` section and automatically
  archives its entries under the new version and release date.
- Limited image captions at widths up to `768px` to the same visible width as
  article blockquotes, while preserving the existing `20px` image breakout.
- Stopped tracking the local `Archive/` tree and moved project docs and
  migration snapshots under it. Updated bootstrap output and verification so
  tracked workflows no longer recreate or depend on local archive files.

## [0.2.27] - 2026-07-23

- Fixed the first multi-image group in the Notes feed still using the legacy
  `10px` top margin.
- Made every first image group inherit `--content-gap: 1.2rem`, while preserving
  `6px` between consecutive image groups.

## [0.2.26] - 2026-07-23

- Unified article and Notes feed content spacing through
  `--content-gap: 1.2rem`.
- Set article and Notes content `h2` top spacing to `2.6rem` and `h3` top
  spacing to `1.8rem`.
- Kept blockquote outer spacing at `2em` and made spacing between paragraphs
  inside blockquotes inherit `--content-gap`.
- Applied the Notes feed rhythm to both the homepage feed and `/notes/`, while
  preserving the larger separation between individual Notes entries.

## [0.2.25] - 2026-07-23

- Introduced `--content-gap: 1.4rem` for same-level article content blocks,
  including paragraphs, code blocks, lists, tables, details, images, and video.
- Kept blockquote outer spacing at `2em` and removed the special `2.5em`
  blockquote-to-image exception.
- Made figures control their own outer rhythm while keeping image-to-caption
  spacing compact and consecutive images grouped at `6px`.

## [0.2.24] - 2026-07-23

- Rebalanced article rhythm with `1.4em` paragraph spacing, `3rem` before `h2`,
  and `2em` before `h3`.
- Set blockquote outer spacing to `2em` and spacing between paragraphs inside
  blockquotes to `1.2em`.

## [0.2.23] - 2026-07-23

- Reset the first and last paragraph margins inside article blockquotes.
- Set spacing between consecutive blockquote paragraphs to `1.6em`, matching
  the article paragraph rhythm at that release.

## [0.2.22] - 2026-07-23

- Increased top-level article paragraph spacing to `1.6em`.
- Kept metadata, tag, and image paragraphs outside the new paragraph rule.

## [0.2.21] - 2026-07-23

- Restored blockquote text from the experimental `1.1em` size to `1em`.
- Kept the existing blockquote weight at `500`.

## [0.2.20] - 2026-07-23

- Increased blockquote text from `1em` to `1.1em` as a stronger-emphasis
  experiment.
