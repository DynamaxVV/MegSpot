# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-05
- Primary product surfaces: Electron + Vue 2 desktop application
- Evidence reviewed: `src/renderer/layout/components/AboutDialog.vue`, `src/renderer/styles/variables.scss`, `src/renderer/styles/index.scss`, existing Element UI components

## Brand

- Personality: practical, quiet, tool-oriented.
- Trust signals: clear file paths, explicit state, predictable native actions.
- Avoid: decorative dashboards, dense controls, hidden failure states.

## Product goals

- Goals: help users inspect local application state and open diagnostic files quickly.
- Non-goals: remote log search, filtering, log editing, or a new logging backend.
- Success signals: the latest log is readable at a glance and the log folder can be opened in one action.

## Personas and jobs

- Primary personas: image/video review users and maintainers diagnosing local failures.
- User jobs: confirm the log location, scan recent output, and hand the log folder to support.
- Key contexts of use: desktop window, mouse and keyboard, constrained dialog height.

## Information architecture

- Primary navigation: Preference dialog tabs.
- Core routes/screens: the `log` tab inside `AboutDialog.vue`.
- Content hierarchy: purpose and status -> log file location -> recent log content.

## Design principles

- Make the current state obvious before exposing details.
- Keep one primary action: open the log folder.
- Preserve the existing compact Element UI vocabulary and avoid introducing a parallel design system.

## Visual language

- Color: `$textColor` for primary text, `$labelColor` for metadata, `$primaryColor` for the main action, light gray page surface.
- Typography: existing system font stack and compact 12-14px utility text.
- Spacing/layout rhythm: 8px base rhythm; content sections separated by 12-16px.
- Shape/radius/elevation: 6-8px radius, subtle border and shadow only for the file card and log viewer.
- Motion: none required for this diagnostic surface.
- Imagery/iconography: Element UI icons only; use document/folder/refresh icons where helpful.

## Components

- Existing components to reuse: `el-button`, `el-icon-*`, `ShowPath`, `el-tabs`, existing dialog styles.
- New/changed components: restyle the log tab inside `AboutDialog.vue`; no new shared component.
- Variants and states: populated log, empty log, and read failure message.
- Token/component ownership: local scoped styles in `AboutDialog.vue`, using existing SCSS variables.

## Accessibility

- Target standard: keyboard-operable desktop UI with visible text labels.
- Keyboard/focus behavior: native Element UI button focus; log viewer remains selectable and scrollable.
- Contrast/readability: primary text must contrast with the light surface; log text uses a readable monospace face.
- Screen-reader semantics: action button has a visible label; log viewer uses `role="log"` and an accessible label.
- Reduced motion and sensory considerations: no required animation.

## Responsive behavior

- Supported breakpoints/devices: desktop Electron dialog; narrow widths should wrap the file path and action row.
- Layout adaptations: file path truncates visually but remains available through the title attribute; log viewer uses horizontal scrolling for long lines.
- Touch/hover differences: no hover-only action.

## Interaction states

- Loading: not applicable; logs are read synchronously during dialog mount.
- Empty: show a calm empty-state message inside the viewer.
- Error: show a readable inline error while keeping the folder action available.
- Success: show the resolved log path and recent line count.
- Disabled: no disabled primary action when a log path is available.
- Offline/slow network: not applicable; local files only.

## Content voice

- Tone: concise, factual, support-oriented.
- Terminology: “日志文件”“最近日志”“打开日志文件夹”.
- Microcopy rules: explain what the area is for; avoid technical jargon unless it helps retrieval.

## Implementation constraints

- Framework/styling system: Vue 2, Element UI, scoped SCSS.
- Design-token constraints: reuse `$textColor`, `$labelColor`, `$primaryColor` and existing dialog spacing.
- Performance constraints: do not parse or filter the log; keep the existing latest-100-lines behavior.
- Compatibility constraints: preserve existing `electron-log` reads and `shell.showItemInFolder` behavior.
- Test/screenshot expectations: Webpack/Vue template compilation and `git diff --check`; manual visual check in the desktop dialog.

## Open questions

- [ ] Whether log rotation/history should become a separate feature; out of scope for this redesign.
