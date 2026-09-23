# Styles

The page's theme and mode live on `<html>` as `data-theme` (`neutral`, `ocean` or `green`) and the `dark` class. An inline script in `index.html` sets them before first paint from the saved choice, and the header's appearance picker (`src/use-cases/Appearance`) changes them.

Tailwind v4, CSS-first (there is no `tailwind.config.js`). `src/index.css` imports these in order, and each file has one job. Outside `tokens.css` and `themes.css`, rules are written as `@apply` with Tailwind utilities; raw CSS appears only where Tailwind has no utility.

| File | Holds | Layer |
| --- | --- | --- |
| `fonts.css` | JetBrains Mono, self-hosted from `@fontsource-variable/jetbrains-mono` | unlayered |
| `themes.css` | 3 color themes (Neutral, Ocean, Green) × light/dark, each as the same 11 role colors (`--scheme-*`), plus per-mode signal colors that never change per theme | unlayered |
| `tokens.css` | Semantic tokens (shadcn's contract + app signals) pointing at scheme roles → Tailwind theme: colors, type scale, tracking, shadows, animations | `@theme` |
| `base.css` | Element defaults: font, selection, focus ring | `base` |
| `utilities.css` | Reusable devices as utilities: `figure`, `tui-title`, `dot-leader`, `page-title`, `invite-highlight`, `upload-progress` | `utilities` |
| `shadcn-skin.css` | The TUI look for stock shadcn components, keyed on `data-slot` | unlayered |
| `charts.css` | Recharts internals, scoped to `[data-slot='chart']` | unlayered |

## Where a new style goes

- **A new color theme.** Copy a light/dark pair of blocks in `themes.css`, rename it, and check every text color reaches 4.5:1 against the page and panel colors. Then add it to `colorThemeOptions` in `src/use-cases/Appearance/appearance.ts` and to the list in the inline script in `index.html`.
- **A new color role.** Add a `--scheme-*` value to every block in `themes.css`, a semantic name in `tokens.css` that points at it, and a `--color-*` binding. Components use only the semantic name (`text-prompt`, `bg-hiring-soft`), never a `--scheme-*` or hex value.
- **A new text size, shadow or animation.** Add it to the `@theme` block in `tokens.css`; Tailwind then generates `text-*`, `shadow-*` or `animate-*` for it. Avoid arbitrary values like `text-[13px]` in components.
- **A pattern used in more than one place.** Add an `@utility` to `utilities.css`. Leave color to the call site unless the color *is* the pattern.
- **Restyling a shadcn component.** Keep `src/components/ui/*` exactly as `shadcn add` installs it. Add a `[data-slot='…']` rule to `shadcn-skin.css` that changes only what the stock class strings hard-code (borders, shadows, overflow, decorations). Never set text color or size there. Those rules are unlayered, so they would beat the `className` a call site passes.
- **Anything else a single component needs.** Use Tailwind classes in that component.
