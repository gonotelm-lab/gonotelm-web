# Design — Gonotelm Web

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

/* Hallmark · pre-emit critique: P4 H4 E4 S4 R5 V4 */

## Genre
editorial

## Macrostructure family
- Marketing pages (Home): Workbench-lite — cream paper, hairline cards, forest accent signal
- App pages (Notebook workspace): Workbench — three panels share tokens; no enrichment
- Content pages: n/a

## Theme
Two modes of one system: **Studio** (light) and **Studio Night** (dark). Selected in
设置 → 通用 → 颜色模式 as 浅色 / 深色 / 跟随系统; the choice is stored in
`localStorage['gonotelm.colorMode']` and applied before first paint.

### Studio (light)

- `--color-paper`      oklch(97% 0.012 90)
- `--color-paper-2`    oklch(94% 0.014 90)
- `--color-paper-3`    oklch(91% 0.016 90)
- `--color-ink`        oklch(20% 0.02 145)
- `--color-ink-2`      oklch(36% 0.018 145)
- `--color-rule`       oklch(86% 0.016 95)
- `--color-accent`     oklch(42% 0.11 150)   /* forest-green · ≤ ~5% viewport */
- `--color-accent-ink` oklch(98% 0.01 90)
- `--color-focus`      oklch(42% 0.11 150)

### Studio Night (dark)

Same hues and chroma as Studio, lightness inverted. Not an inversion filter: the
surfaces are warm green-tinted charcoal (never pure black, never neutral grey),
body copy is cream (never pure white), and the brand green is lifted to L≈73% so
one accent can be both a fill (dark ink text, 7.9:1) and a link/icon colour
(6.1:1 on a card).

Surfaces sit one deliberate step lighter than a "pure dark" theme
(card L 29.5%, canvas 24%): large areas of light text on a dark ground read
easier that way. Every contrast contract in `theme.test.ts` is re-tuned and green
at these values.

- `--color-paper`      oklch(29.5% 0.012 155)   /* card   #282e2a */
- `--color-paper-2`    oklch(24% 0.012 155)     /* canvas #1b211d */
- `--color-paper-3`    oklch(19.5% 0.011 155)   /* recess #111613 */
- `--color-ink`        oklch(93.5% 0.01 95)     /* cream  #ebeae2 · 11.5:1 on card */
- `--color-ink-2`      oklch(74.5% 0.014 130)   /* 6.1:1 on card */
- `--color-rule`       oklch(37.5% 0.014 150)   /* hairline, 1.36:1 on card (light: 1.37) */
- `--color-accent`     oklch(73.3% 0.078 161)   /* #7cb899 */
- `--color-accent-deep` oklch(79% 0.072 161)    /* hover goes **up** in dark, not down */
- `--color-accent-ink` oklch(20% 0.02 160)

### Dark-mode rules

- Elevation: dark surfaces cannot separate by colour alone, so shadows get much
  heavier (and were pulled back ~10% alpha when the surfaces were lightened).
  They live in `theme.workspaceElevation` (`workspaceElevationDark`), never as
  inline `rgba()`.
- Semantic tones (`sourceType` / `artifactKind`) keep hue, raise accent to L≈73%
  and border to L≈44%; every accent lands in one contrast band (5.7–6.1:1 on a
  card) so no type reads louder than another.
- `artifactList` and `mindmap` ship explicit light/dark pairs — canvas painting
  cannot read CSS variables, so the consumer picks by `palette.mode`.
- Overlays: the backdrop is near-black (`overlay.backdropColor`) in dark, not the
  brand-green veil used on cream.
- Code blocks are the one cool-ink surface in an otherwise warm palette
  (`palette.code.surface`, `#f0efe8` light / `#172023` dark) and switch Prism theme
  `oneLight` → `oneDark`.
- Documents stay documents: rendered PPTX slides, images, PDF/EPUB previews, video
  and the avatar-crop canvas keep their own colours in both modes.
- The tab icon and `BrandMark` swap to the cream glyph in dark (forest green on a
  dark tab reads at only 2.5:1).

## Typography
- UI (all app chrome / Chinese copy): Geist 400/500/600 + Noto Sans SC / system CJK
- Display accent (Latin-only moments): Instrument Serif 400 roman — **do not** set on CJK titles
- Mono: JetBrains Mono — **code blocks only**, never notebook meta / captions
- Letter-spacing: `0` on UI text (negative tracking breaks CJK rhythm)
- Type scale anchor: workspace 12 / 14 / 18 / 20 px

## Spacing
4-point named scale via MUI spacing (8px base) + `layoutTokens`.

## Motion
- Easings: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1)
- Reveal: quiet fade / opacity; no bounce, no card lift spam
- Hover: forest border / soft wash; reduced-motion ≤ 150ms opacity

## Microinteractions stance
- silent success
- hover delay 800 ms · focus delay 0 ms
- primary button: solid forest fill, 8px radius, no gradient pill

## CTA voice
- Primary CTA: forest fill, cream ink
- Secondary CTA: hairline outline + ink
- Copy: specific, restrained, slightly literary Chinese; no emoji ornament

## Per-page allowances
- Home MAY use hairline card grid + sparse forest accents
- App pages MUST NOT use enrichment / multi-accent floods
- Accent footprint stays small (signal, not flood)

## What pages MUST share
- Warm paper + forest accent — **both modes** (cream paper / green ink in light,
  charcoal paper / lifted green in dark)
- Instrument Serif (display) + Geist (body) + JetBrains Mono
- Hairline borders over heavy shadows
- Quiet motion
- No hard-coded colours: read `theme.palette.*`, `theme.workspacePalette.*` or
  `theme.workspaceElevation.*` so both modes stay in sync

## What pages MAY differ on
- Status hues for artifact states (cool-biased greens/ambers)
- Code surfaces may use slightly cooler ink wash

## Workspace semantic tones (Studio)
Per-type accents live in `workspaceColorPalette.artifactKind` / `sourceType`.
They must stay quiet on cream paper (surface ~8% alpha); never Hum-loud multi-accent floods.

| Kind | Role hue |
|---|---|
| mindmap | forest (brand) |
| report | olive |
| info_graphic | teal |
| audio_overview | slate-ink |
| flashcard | brass |
| quiz | terracotta |
| data_table | blue-slate |
| note | sage |
| source pdf / url / xlsx… | matching quiet chroma + **Outlined** icons |

## Audience / use case / tone
- Audience: general notebook + AI workspace users
- Use case: Home → create/open notebook → Sources / Chat / Studio
- Tone: editorial · Studio · calm · forest signal (light: cream daylight / dark: forest night)

## Exports

### tokens.css
See project-root `tokens.css`.

### Tailwind v4 `@theme`
```css
@theme {
  --color-paper:   oklch(97% 0.012 90);
  --color-ink:     oklch(20% 0.02 145);
  --color-accent:  oklch(42% 0.11 150);
  --font-display:  "Instrument Serif", serif;
  --font-body:     "Geist", "Noto Sans SC", sans-serif;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`
```json
{
  "color": {
    "paper":  { "$value": "oklch(97% 0.012 90)", "$type": "color" },
    "ink":    { "$value": "oklch(20% 0.02 145)", "$type": "color" },
    "accent": { "$value": "oklch(42% 0.11 150)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Instrument Serif", "$type": "fontFamily" },
    "body":    { "$value": "Geist", "$type": "fontFamily" }
  }
}
```

### Colour mode plumbing (source of truth)

| Piece | File |
|---|---|
| Modes, storage key, system resolution, DOM application | `src/app/colorMode.ts` |
| Store + hooks (`useColorMode`, `useResolvedColorMode`, `setColorMode`) | `src/app/colorModeStore.ts` |
| Theme assembly (light/dark) | `src/app/theme.ts` |
| No-flash first paint (must stay in sync with `colorMode.ts`) | `index.html` |
| Setting UI | `src/components/settings/ColorModeControl.tsx` |

### shadcn/ui CSS variables
```css
:root {
  --background:         97% 0.012 90;
  --foreground:         20% 0.02 145;
  --primary:            42% 0.11 150;
  --primary-foreground: 98% 0.01 90;
  --muted:              86% 0.016 95;
  --muted-foreground:   36% 0.018 145;
  --border:             86% 0.016 95;
  --ring:               42% 0.11 150;
  --radius:             8px;
}
```
