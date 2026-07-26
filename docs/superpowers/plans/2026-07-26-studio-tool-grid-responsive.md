# Studio Tool Grid Responsive Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio tool cards switch 3 → 2 → 1 columns from panel content width via CSS container queries, without title wrapping.

**Architecture:** Named layout constants + `container-type: inline-size` on the tool grid; `@container` rules set `grid-template-columns`. Card titles use `noWrap`/ellipsis as overflow fallback. No ResizeObserver / React column state.

**Tech Stack:** React, MUI `sx`, Vitest

## Global Constraints

- Trigger: grid container inline-size (not viewport breakpoints)
- Mechanism: CSS container queries only
- Column ladder: 3 → 2 → 1
- Scope: Studio tool catalog grid + title overflow only

---

### Task 1: Layout constants + grid wiring

**Files:**
- Create: `src/components/notebook-workspace/panel/studio/studioToolGridLayout.ts`
- Create: `src/components/notebook-workspace/panel/studio/studioToolGridLayout.test.ts`
- Modify: `src/components/notebook-workspace/panel/studio/StudioPanel.tsx` (tool grid `Box` sx)

**Interfaces:**
- Produces: `studioToolGridThreeColMinPx`, `studioToolGridTwoColMinPx`, `studioToolGridSx`

- [x] **Step 1:** Add failing test that exports ascending breakpoints and default 1-col → 2 → 3 ladder
- [x] **Step 2:** Implement `studioToolGridLayout.ts` + apply `studioToolGridSx` in `StudioPanel`
- [x] **Step 3:** Run layout unit test

### Task 2: Card title noWrap

**Files:**
- Modify: `src/components/notebook-workspace/panel/studio/components/StudioToolCard.tsx`
- Test: existing `StudioToolCard.test.tsx` (smoke still passes)

- [x] **Step 1:** Title `Typography` → `noWrap` + ellipsis; ensure title stack `minWidth: 0`
- [x] **Step 2:** Run `StudioToolCard.test.tsx` + studio layout tests
- [ ] **Step 3:** Commit

## Manual check

Drag Studio panel width: ~default → 3 cols; mid → 2; near min → 1; titles stay single-line.
