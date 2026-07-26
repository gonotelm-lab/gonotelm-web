# Workspace Mobile Tabs Design

## Goal

Provide a usable small-screen Workspace: one panel at a time with a bottom tab bar, without changing the desktop three-column + resize architecture.

## Locked decisions

| Item | Choice |
|---|---|
| Breakpoint | MUI `md` (900px): `<md` mobile shell, `≥md` desktop grid |
| Mobile IA | Bottom tabs: 来源 / 对话 / Studio |
| Default tab | 对话 (`chat`) |
| Panel lifecycle | Keep all three mounted; hide inactive with `display: none` |
| URL | In-page state only (no route sync) |
| Desktop | Unchanged fold + drag resize |

## Behavior

- Tab switch shows the selected panel full-height above the tab bar.
- Citation jump → switch to `sources` and open inline preview (existing preview request).
- Chat “expand sources / studio” on mobile → switch tab (desktop still expands collapsed columns).
- Sources / Studio collapse buttons hidden below `md`.
- Resize handles remain `display: none` below `md`.

## Non-goals

- Drawer / overlay panel patterns
- Home page responsive redesign
- Full a11y audit (tabs still expose `aria-label`)

## Verification widths

375 / 768 / 1024 / 1440

## Smoke checklist

| Width | Expect |
|---|---|
| 375 | Bottom tabs visible; one panel full height; no resize handles; no Sources/Studio collapse |
| 768 (`<md`) | Same mobile shell (still below 900) |
| 1024 (`≥md`) | Three-column grid + resize handles; tab bar hidden |
| 1440 | Desktop layout unchanged |

Citation jump on mobile must land on 来源 with preview open. Tab switches must keep chat scroll / stream / preview state (panels stay mounted).
