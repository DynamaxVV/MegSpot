# MegSpot - vv Edition

<p align="center">
  <img width="550" src="./src/renderer/assets/images/big_logo_dark.png" alt="MegSpot logo">
</p>

<p align="center">
  English | <a href="README.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/DynamaxVV/MegSpot/actions/workflows/build.yml"><img src="https://github.com/DynamaxVV/MegSpot/actions/workflows/build.yml/badge.svg" alt="Build status"></a>
  <a href="https://github.com/DynamaxVV/MegSpot/releases"><img src="https://img.shields.io/github/v/release/DynamaxVV/MegSpot?include_prereleases&label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache 2.0 license"></a>
</p>

MegSpot - vv Edition is a local image comparison desktop tool for visual result review, version-difference checks, and annotation verification. It turns two image sets or folders into a traceable comparison task, with focused improvements to batch pairing, three comparison layouts, source-change protection, TXT annotation review, and resource management for large images and rapid navigation. It is designed for local workflows where image assets should stay on the user's machine.

This repository is an unofficial modified edition maintained by [vv](https://github.com/DynamaxVV), based on upstream [MegEngine/MegSpot](https://github.com/MegEngine/MegSpot). It is not an official upstream release; upstream code, copyright, and third-party licenses remain governed by the repository's license files.

## Use cases

- **Result review**: compare baseline and generated images, before-and-after results, or renders from different versions.
- **Batch difference checks**: pair two image folders while keeping source order and pairing decisions reviewable.
- **Annotation verification**: read TXT annotations next to image sources and review them alongside both canvases.

## What this edition improves

- **Paired image comparison workspace**: add images or folders on the left and right, preview pairing, reorder sources, and enter comparison from one flow.
- **Explicit pairing rules**: exact basename matching ignores extension and case; remaining images pair in each side's sort order; folders include direct child images only and deduplicate absolute paths.
- **Three comparison layouts**: side by side, single, and split, with keyboard navigation between pairs and temporary opposite-side viewing.
- **Source-change protection**: content edits reload; additions, removals, and renames freeze the task until pairs are explicitly refreshed.
- **Review annotations**: read valid TXT annotations from image-source folders, show annotation numbers on the canvases, and inspect review text in a side panel.
- **Large-image and rapid-navigation work**: manage thumbnail caches, <code>ImageBitmap</code>, OpenCV matrices, Blob URLs, Canvas backing stores, and nearby-pair preloading.
- **Local diagnostics**: correlate pairing actions, image loading failures, and render exceptions to make white-screen or loading issues easier to investigate.
- **Interaction updates**: configurable hotkeys, Space-to-reset, double-click single-image selection, and Original/High-resolution display modes.

## Typical workflow

### 1. Prepare sources

Add images or folders on both sides of the dashboard. Each side can contain multiple sources, and folder order can be adjusted by dragging. Folders include direct child images only, do not recurse into subdirectories, and deduplicate paths by absolute path.

### 2. Confirm pairing

The dashboard shows a pairing preview before entering the workspace. Basenames are matched exactly after removing extensions and ignoring case; unmatched images are then paired according to the sorted order on each side. Confirm the order and unmatched items before continuing.

### 3. Compare images

Use side-by-side, single, or split mode. Up and Down move between pairs; holding Left or Right temporarily shows the opposite side. Color and filter settings persist when switching pairs or returning to the dashboard; use “Reset all” in the filter panel to restore defaults.

### 4. Review and refresh

When a valid TXT annotation file is present in an image-source folder, review mode can show annotations on the canvases and in the side panel. Content edits reload the display; additions, removals, and renames mark the task as stale and require an explicit pair refresh.

## Current feature boundary

The public feature scope is local image comparison. Image snapshots (<code>.mgt</code>), GIF export, video preview/screenshot comparison/frame synchronization, HEVC/H.265 playback, Linux command-line launch, and multilingual UI are outside the current public capability. Future inclusion is determined by the actual code and release notes.

## Downloads, builds, and releases

Version assets and checksums are published through [GitHub Releases](https://github.com/DynamaxVV/MegSpot/releases). Supported platforms, CPU architectures, signing status, and installation instructions belong to the release notes for each version. Unsigned programs may trigger Windows SmartScreen or macOS Gatekeeper warnings; this is a distribution-status limitation and does not mean the application uploads images at runtime.

The project uses the legacy Webpack 4 and Electron toolchain. Use Node.js <code>16.20.2</code> and Yarn <code>1.22.21</code> declared by the repository:

```bash
corepack enable
corepack prepare yarn@1.22.21 --activate
yarn install --frozen-lockfile --ignore-engines
yarn dev
```

Common checks and build commands:

```bash
yarn lint
yarn e2e
npm run pack:main
npm run build:web
npm run build:win64
npm run build:linux
npm run build:mac
```

See [Build and Release](docs/BUILD_AND_RELEASE.md) for environment requirements, artifact checks, version tags, and GitHub Actions.

## Data and network boundaries

At runtime the application is local-file oriented: it does not require login and does not include automatic updates, Firebase analytics, or an exposed built-in HTTP service. Ordinary image comparison tasks do not upload images to a remote service. Dependency installation, GitHub Actions, and GitHub Releases still require network access and should be treated as separate boundaries.

## Project documentation

- [User Guide](docs/USER_GUIDE.md): paired comparison, annotation review, image workflows, and hotkeys.
- [Build and Release](docs/BUILD_AND_RELEASE.md): local builds, release gates, and the GitHub Actions flow.
- [CHANGELOG](CHANGELOG.md): changes by modified version.
- [Memory Lifecycle](docs/MEMORY_LIFECYCLE.md): release constraints for images, Canvas, workers, caches, and preloading.
- [Contributing](CONTRIBUTING.md): issues, pull requests, and licensing boundaries.

## Attribution and license

This is a modified edition of upstream MegSpot. Upstream code, original copyright, and third-party notices remain governed by [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT), and [ACKNOWLEDGMENTS](ACKNOWLEDGMENTS); changes in this repository do not alter the license terms of upstream code.

Please use this repository's [Issues](https://github.com/DynamaxVV/MegSpot/issues) for questions and bug reports. Pull requests are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) first.
