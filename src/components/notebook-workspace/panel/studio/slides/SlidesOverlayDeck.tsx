import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { PresentationData } from '@aiden0z/pptx-renderer'
import { subtleScrollbarSx } from '../../../shared/ui/scrollbar'
import { resolveWorkspaceElevation } from '../../../shared/ui/workspaceElevation'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { THUMB_NEIGHBOR_RANGE, THUMB_RAIL_WIDTH_PX, THUMB_WIDTH_PX } from './constants'
import { getSlideCount, loadPptxModule } from './pptxEngine'
import { ensureSlidesPreviewFonts } from './slidesPreviewFonts'
import { slidesRenderSurfaceSx } from './slidesRenderSurface'
import {
  STAGE_WHEEL_COOLDOWN_MS,
  accumulateStageWheelDelta,
  resolveStageWheelStep,
} from './stageWheelNav'

interface SlidesOverlayDeckProps {
  presentation: PresentationData
  initialIndex?: number
}

type SlideHandleLike = {
  dispose: () => void
  ready?: Promise<unknown>
}

type PptxViewerLike = {
  load: (presentation: PresentationData) => void
  destroy: () => void
  renderSlideToContainer: (
    index: number,
    container: HTMLElement,
  ) => SlideHandleLike | null | undefined
  renderThumbnailToContainer: (
    index: number,
    container: HTMLElement,
    options?: { width?: number },
  ) => SlideHandleLike | null | undefined
}

export function SlidesOverlayDeck({
  presentation,
  initialIndex = 0,
}: SlidesOverlayDeckProps) {
  const slideCount = getSlideCount(presentation)
  const clampedInitial = Math.min(
    Math.max(0, Math.floor(initialIndex)),
    Math.max(0, slideCount - 1),
  )
  const [activeIndex, setActiveIndex] = useState(clampedInitial)
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(
    () => new Set([clampedInitial]),
  )
  const [viewerEpoch, setViewerEpoch] = useState(0)

  const viewerHostRef = useRef<HTMLDivElement>(null)
  const stagePaneRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const railScrollRef = useRef<HTMLDivElement>(null)
  const thumbSlotRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const viewerRef = useRef<PptxViewerLike | null>(null)
  const stageHandleRef = useRef<SlideHandleLike | null>(null)
  const thumbHandlesRef = useRef<Map<number, SlideHandleLike>>(new Map())
  const wheelAccumRef = useRef(0)
  const wheelCooldownUntilRef = useRef(0)

  const mountThumbIndexes = useMemo(() => {
    const next = new Set<number>()
    for (const index of visibleIndexes) {
      next.add(index)
    }
    for (
      let index = Math.max(0, activeIndex - THUMB_NEIGHBOR_RANGE);
      index <= Math.min(slideCount - 1, activeIndex + THUMB_NEIGHBOR_RANGE);
      index += 1
    ) {
      next.add(index)
    }
    return next
  }, [activeIndex, slideCount, visibleIndexes])

  useEffect(() => {
    let cancelled = false
    const thumbHandles = thumbHandlesRef.current

    void (async () => {
      const host = viewerHostRef.current
      if (!host) {
        return
      }
      await ensureSlidesPreviewFonts()
      const { PptxViewer } = await loadPptxModule()
      if (cancelled || !viewerHostRef.current) {
        return
      }
      const viewer = new PptxViewer(viewerHostRef.current, {
        fitMode: 'contain',
        lazyMedia: true,
        lazySlides: true,
        pdfjs: false,
      }) as unknown as PptxViewerLike
      viewer.load(presentation)
      viewerRef.current = viewer
      setViewerEpoch((prev) => prev + 1)
    })()

    return () => {
      cancelled = true
      stageHandleRef.current?.dispose()
      stageHandleRef.current = null
      for (const handle of thumbHandles.values()) {
        handle.dispose()
      }
      thumbHandles.clear()
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [presentation])

  useEffect(() => {
    const viewer = viewerRef.current
    const stage = stageRef.current
    if (!viewer || !stage || slideCount <= 0) {
      return
    }

    stageHandleRef.current?.dispose()
    stageHandleRef.current = null
    stage.replaceChildren()

    const handle = viewer.renderSlideToContainer(activeIndex, stage)
    stageHandleRef.current = handle ?? null

    return () => {
      handle?.dispose()
      if (stageHandleRef.current === handle) {
        stageHandleRef.current = null
      }
    }
  }, [activeIndex, presentation, slideCount, viewerEpoch])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || slideCount <= 0) {
      return
    }

    for (const [index, handle] of [...thumbHandlesRef.current.entries()]) {
      if (!mountThumbIndexes.has(index)) {
        handle.dispose()
        thumbHandlesRef.current.delete(index)
        const slot = thumbSlotRefs.current.get(index)
        slot?.replaceChildren()
      }
    }

    for (const index of mountThumbIndexes) {
      if (thumbHandlesRef.current.has(index)) {
        continue
      }
      const slot = thumbSlotRefs.current.get(index)
      if (!slot) {
        continue
      }
      slot.replaceChildren()
      const handle = viewer.renderThumbnailToContainer(index, slot, {
        width: THUMB_WIDTH_PX,
      })
      if (handle) {
        thumbHandlesRef.current.set(index, handle)
      }
    }
  }, [mountThumbIndexes, presentation, slideCount, viewerEpoch])

  useEffect(() => {
    const rail = railScrollRef.current
    if (!rail || typeof IntersectionObserver === 'undefined') {
      setVisibleIndexes(new Set(Array.from({ length: Math.min(slideCount, 5) }, (_, i) => i)))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIndexes((prev) => {
          const next = new Set(prev)
          for (const entry of entries) {
            const raw = (entry.target as HTMLElement).dataset.slideIndex
            const index = Number(raw)
            if (!Number.isFinite(index)) {
              continue
            }
            if (entry.isIntersecting) {
              next.add(index)
            } else {
              next.delete(index)
            }
          }
          return next
        })
      },
      {
        root: rail,
        threshold: 0.1,
      },
    )

    for (const slot of thumbSlotRefs.current.values()) {
      observer.observe(slot.parentElement ?? slot)
    }

    return () => {
      observer.disconnect()
    }
  }, [slideCount])

  useEffect(() => {
    const slot = thumbSlotRefs.current.get(activeIndex)
    slot?.parentElement?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    const pane = stagePaneRef.current
    if (!pane || slideCount <= 1) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      const stepProbe = resolveStageWheelStep(event.deltaX, event.deltaY)
      if (stepProbe === 0) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const now = performance.now()
      if (now < wheelCooldownUntilRef.current) {
        return
      }

      const { nextAccum, step } = accumulateStageWheelDelta(
        wheelAccumRef.current,
        event.deltaX,
        event.deltaY,
      )
      wheelAccumRef.current = nextAccum
      if (step === 0) {
        return
      }

      wheelCooldownUntilRef.current = now + STAGE_WHEEL_COOLDOWN_MS
      setActiveIndex((prev) => Math.min(slideCount - 1, Math.max(0, prev + step)))
    }

    pane.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      pane.removeEventListener('wheel', onWheel)
    }
  }, [slideCount])

  return (
    <Stack direction="row" sx={{ height: '100%', minHeight: 0, width: '100%' }}>
      <Box
        ref={railScrollRef}
        sx={(theme) => ({
          width: THUMB_RAIL_WIDTH_PX,
          flexShrink: 0,
          overflow: 'auto',
          borderRight: '1px solid',
          borderColor: 'divider',
          py: workspaceSpace.md,
          px: workspaceSpace.md,
          boxSizing: 'border-box',
          ...subtleScrollbarSx(theme),
        })}
      >
        <Stack spacing={workspaceSpace.sm}>
          {Array.from({ length: slideCount }, (_, index) => {
            const selected = index === activeIndex
            return (
              <Box
                key={`slide-thumb-${index}`}
                component="button"
                type="button"
                aria-label={`Slide ${index + 1}`}
                aria-pressed={selected}
                onClick={() => setActiveIndex(index)}
                data-slide-index={index}
                sx={{
                  display: 'block',
                  width: '100%',
                  p: 0,
                  m: 0,
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  borderRadius: workspaceRadius.sm,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  bgcolor: 'background.paper',
                  boxShadow: selected
                    ? (theme) =>
                        `0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}, ${resolveWorkspaceElevation(theme).raised}`
                    : (theme) => resolveWorkspaceElevation(theme).raisedMuted,
                }}
              >
                <Box
                  ref={(node: HTMLDivElement | null) => {
                    if (node) {
                      thumbSlotRefs.current.set(index, node)
                    } else {
                      thumbSlotRefs.current.delete(index)
                    }
                  }}
                  className="slides-render-surface"
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    bgcolor: 'background.default',
                    ...slidesRenderSurfaceSx,
                  }}
                />
              </Box>
            )
          })}
        </Stack>
      </Box>

      <Box
        ref={stagePaneRef}
        data-testid="slides-overlay-stage-pane"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Box
          ref={stageRef}
          data-testid="slides-overlay-stage"
          data-active-index={activeIndex}
          className="slides-render-surface"
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'grid',
            placeContent: 'center',
            // Keep overflow visible so page frame shadow is not clipped.
            overflow: 'visible',
            bgcolor: 'background.default',
            p: workspaceSpace.lg,
            boxSizing: 'border-box',
            ...slidesRenderSurfaceSx,
            '& > *': {
              borderRadius: workspaceRadius.sm,
              border: '1px solid',
              borderColor: theme.palette.divider,
              boxShadow: resolveWorkspaceElevation(theme).menu,
              overflow: 'hidden',
              boxSizing: 'border-box',
            },
          })}
        />
      </Box>

      <Box
        ref={viewerHostRef}
        aria-hidden
        sx={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
        }}
      />
    </Stack>
  )
}
