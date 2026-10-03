import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Dialog, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  AVATAR_CROP_SIZE,
  centeredCropArea,
  cropImageToBlob,
  createObjectUrl,
  loadAvatarImage,
  type AvatarCanvasFactory,
  type AvatarCropArea,
  type AvatarImageFactory,
  type AvatarImageInfo,
} from '../../lib/avatarImage'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../notebook-workspace/shared/ui/motionTokens'

/** 裁剪预览区的 CSS 像素边长；与输出像素解耦，输出恒为 256。 */
const VIEWPORT_SIZE = 320

/** 拖拽类型：移动裁剪框，或沿对角线缩放它。 */
type CropDrag =
  | { mode: 'move'; pointerId: number; startX: number; startY: number; originX: number; originY: number }
  | {
      mode: 'resize'
      pointerId: number
      anchorX: number
      anchorY: number
      startX: number
      startY: number
      initialSize: number
    }

interface AvatarCropDialogProps {
  /** 用户已通过校验的原始图片。 */
  file: File
  open: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void | Promise<void>
  /** 画布工厂接缝，仅用于在没有 DOM 的测试环境注入替身。 */
  createCanvas?: AvatarCanvasFactory
  /** 图片解码工厂接缝，仅用于在没有 DOM 的测试环境注入替身。 */
  createImage?: AvatarImageFactory
}

/**
 * 头像裁剪对话框：图片铺满视口，中间叠加固定大小的方形虚线裁剪框，
 * 用户拖拽图片选择区域，输出固定 256×256 的 JPEG。
 */
export function AvatarCropDialog({
  file,
  open,
  onCancel,
  onConfirm,
  createCanvas,
  createImage,
}: AvatarCropDialogProps) {
  const { t } = useTranslation(['settings', 'common'])
  // 解码后的图片元素：既用于裁剪绘制，也是「可确认」状态的判据。
  const decodedImageRef = useRef<HTMLImageElement | null>(null)

  const [info, setInfo] = useState<AvatarImageInfo | null>(null)
  // 裁剪框中心在源图坐标中的位置；用中心而非左上角，夹紧时更容易保持视觉稳定。
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  // 用户手动调整后的裁剪边长（源图像素）；null 表示「取最大内接正方形」。
  const [cropSizeState, setCropSizeState] = useState<number | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const dragStateRef = useRef<CropDrag | null>(null)

  // 预览地址与解码必须在同一个 effect 内创建：StrictMode 会 setup→cleanup→setup，
  // 若 URL 由 useMemo 派生，cleanup 撤销它之后第二次 setup 不会重建，
  // 于是 <img> 与解码都会拿到一个已失效的 blob URL，图片永远加载失败。
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 解码走与校验同一条路径，不依赖渲染出的 <img> 的 onLoad：
  // 无 DOM 的测试环境无法触发宿主元素事件，裁剪框与确认按钮就会永远不可用。
  useEffect(() => {
    let cancelled = false
    const url = createObjectUrl(file)
    void loadAvatarImage(url, createImage)
      .then((element) => {
        if (cancelled) return
        const width = element.naturalWidth || element.width
        const height = element.naturalHeight || element.height
        const area = centeredCropArea(width, height)
        decodedImageRef.current = element
        setInfo({ width, height })
        setCropSizeState(null)
        setCenter({ x: area.x + area.size / 2, y: area.y + area.size / 2 })
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
      // 只撤销本次 setup 自己创建的 URL。
      URL.revokeObjectURL(url)
    }
  }, [file, createImage])

  /** 图片短边：裁剪框能达到的最大边长（最大内接正方形）。 */
  const maxCropSize = useMemo(() => {
    if (!info) return AVATAR_CROP_SIZE
    return Math.max(1, Math.min(info.width, info.height))
  }, [info])

  /** 下限取输出边长，避免把小于成品的区域放大导致模糊。 */
  const minCropSize = Math.min(AVATAR_CROP_SIZE, maxCropSize)

  /** 源图上裁剪框的边长：在 [min, max] 内，由用户拖拽右下角调整。 */
  const cropSize = cropSizeState === null
    ? maxCropSize
    : Math.min(Math.max(cropSizeState, minCropSize), maxCropSize)

  /** 把中心点夹紧到图片范围内，保证裁剪框永不越界。 */
  const clampCenter = useCallback(
    (next: { x: number; y: number }, size: number, source: AvatarImageInfo) => {
      const half = size / 2
      return {
        x: Math.min(Math.max(next.x, half), Math.max(half, source.width - half)),
        y: Math.min(Math.max(next.y, half), Math.max(half, source.height - half)),
      }
    },
    [],
  )

  // 拖拽后在渲染期夹紧，避免裁剪框滑出图片（无需 effect 回写 state）。
  const clampedCenter = useMemo(() => {
    if (!info || !center) return null
    return clampCenter(center, cropSize, info)
  }, [center, cropSize, info, clampCenter])

  const cropArea: AvatarCropArea | null = clampedCenter
    ? { x: clampedCenter.x - cropSize / 2, y: clampedCenter.y - cropSize / 2, size: cropSize }
    : null

  /**
   * 源图 → 视口的显示比例。取「完整可见」的比例，让整张图都落在视口内，
   * 裁剪框才有可移动的余地；同时框的显示尺寸严格等于 cropSize × scale，
   * 所见即所得（用铺满比例会让框小于真实选区，显示与实际裁剪不一致）。
   */
  const displayScale = useMemo(() => {
    if (!info) return 1
    return Math.min(VIEWPORT_SIZE / info.width, VIEWPORT_SIZE / info.height)
  }, [info])

  /** 图片完整可见时居中留出的边距。 */
  const imageLeft = info ? (VIEWPORT_SIZE - info.width * displayScale) / 2 : 0
  const imageTop = info ? (VIEWPORT_SIZE - info.height * displayScale) / 2 : 0

  /**
   * 指针捕获并非所有环境都可用（指针非活动时 setPointerCapture 会抛错）。
   * 拖拽状态必须在此之前写好，否则一次异常就会让整个拖拽彻底失效。
   */
  const capturePointer = (event: React.PointerEvent<HTMLElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // 退化为普通事件流：指针留在预览区内时拖拽照常工作。
    }
  }

  /** 在预览区任意位置按下 = 移动裁剪框。 */
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropArea || !info) return
    dragStateRef.current = {
      mode: 'move',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropArea.x,
      originY: cropArea.y,
    }
    setDragging(true)
    capturePointer(event)
  }

  /** 按下右下角手柄 = 沿对角线缩放裁剪框，左上角保持不动。 */
  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropArea || !info) return
    event.stopPropagation()
    dragStateRef.current = {
      mode: 'resize',
      pointerId: event.pointerId,
      anchorX: cropArea.x,
      anchorY: cropArea.y,
      startX: event.clientX,
      startY: event.clientY,
      initialSize: cropArea.size,
    }
    setDragging(true)
    capturePointer(event)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || !info || drag.pointerId !== event.pointerId) return

    if (drag.mode === 'resize') {
      // 必须用位移而不是绝对坐标：clientX/Y 相对浏览器窗口，而 imageLeft/Top 相对预览区，
      // 两者原点不同（对话框在屏幕上的位置），直接相减会得到一个偏大的尺寸而永远顶到上限。
      const delta = Math.max(event.clientX - drag.startX, event.clientY - drag.startY)
      const desired = drag.initialSize + delta / displayScale
      // 锚点（左上角）固定时最多还能放多大：受图片右/下边限制，保证不越界。
      const upper = Math.max(
        minCropSize,
        Math.min(maxCropSize, info.width - drag.anchorX, info.height - drag.anchorY),
      )
      const next = Math.min(Math.max(desired, minCropSize), upper)
      setCropSizeState(next)
      setCenter({ x: drag.anchorX + next / 2, y: drag.anchorY + next / 2 })
      return
    }

    // 屏幕位移换算回源图像素。
    const deltaX = (event.clientX - drag.startX) / displayScale
    const deltaY = (event.clientY - drag.startY) / displayScale
    const nextCenter = {
      x: drag.originX + deltaX + cropSize / 2,
      y: drag.originY + deltaY + cropSize / 2,
    }
    setCenter(clampCenter(nextCenter, cropSize, info))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
      setDragging(false)
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // 与 capturePointer 同理：释放失败不影响状态复位。
      }
    }
  }

  const handleConfirm = async () => {
    const image = decodedImageRef.current
    if (!image || !cropArea) return
    setSubmitting(true)
    try {
      const blob = await cropImageToBlob(
        image,
        {
          x: Math.round(cropArea.x),
          y: Math.round(cropArea.y),
          size: Math.round(cropArea.size),
        },
        { createCanvas },
      )
      await onConfirm(blob)
    } finally {
      setSubmitting(false)
    }
  }

  const ready = Boolean(cropArea && info)

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      maxWidth={false}
      data-testid="avatar-crop-dialog"
      slotProps={{
        paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius, overflow: 'hidden' } },
      }}
    >
      <Box sx={{ px: workspaceSpace.lg, pt: workspaceSpace.lg, pb: workspaceSpace.md }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('settings:avatar.title')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          px: workspaceSpace.lg,
          pb: workspaceSpace.md,
        }}
      >
        <Box
          data-testid="avatar-crop-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          sx={(theme) => ({
            position: 'relative',
            width: VIEWPORT_SIZE,
            height: VIEWPORT_SIZE,
            maxWidth: '100%',
            overflow: 'hidden',
            borderRadius: workspaceRadius.md,
            backgroundColor: theme.palette.action.hover,
            cursor: ready ? (dragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
          })}
        >
          <Box
            component="img"
            src={previewUrl ?? undefined}
            alt=""
            draggable={false}
            data-testid="avatar-crop-image"
            onError={() => setLoadFailed(true)}
            sx={{
              position: 'absolute',
              // 图片完整可见并固定在视口中央；移动的是裁剪框，不是图。
              width: info ? info.width * displayScale : VIEWPORT_SIZE,
              height: info ? info.height * displayScale : VIEWPORT_SIZE,
              left: imageLeft,
              top: imageTop,
              maxWidth: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
              transition: workspaceTransitionPresets.opacityOnly,
            }}
          />

          {/* 裁剪框：可拖拽的虚线方框，四周压暗以突出选区。 */}
          <Box
            aria-hidden
            data-testid="avatar-crop-frame"
            sx={{
              position: 'absolute',
              left: cropArea ? imageLeft + cropArea.x * displayScale : 0,
              top: cropArea ? imageTop + cropArea.y * displayScale : 0,
              width: cropArea ? cropArea.size * displayScale : 0,
              height: cropArea ? cropArea.size * displayScale : 0,
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              border: '1px dashed rgba(255,255,255,0.9)',
              opacity: ready ? 1 : 0,
              transition: workspaceTransitionPresets.opacityOnly,
            }}
          >
            {/* 右下角手柄：沿对角线拖动缩放裁剪框。父级 pointerEvents 为 none，
                这里显式恢复 auto，才能接住按下事件。 */}
            {ready ? (
              <Box
                data-testid="avatar-crop-resize"
                onPointerDown={handleResizePointerDown}
                sx={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 18,
                  height: 18,
                  pointerEvents: 'auto',
                  cursor: 'nwse-resize',
                  // 右下角的 L 形折角，与虚线框同一套视觉语言，而不是一个孤立的白点。
                  borderRight: '2px solid rgba(255,255,255,0.95)',
                  borderBottom: '2px solid rgba(255,255,255,0.95)',
                  filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.7))',
                }}
              />
            ) : null}
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: workspaceSpace.lg, pb: workspaceSpace.md }}>
        <Typography variant="caption" color="text.secondary">
          {t('settings:avatar.dragHint')}
        </Typography>
        {loadFailed ? (
          <Typography
            variant="caption"
            sx={(theme) => ({ display: 'block', color: theme.workspacePalette.status.error })}
          >
            {t('settings:avatar.decodeFailed')}
          </Typography>
        ) : null}
      </Box>

      <Stack
        direction="row"
        spacing={workspaceDialogLayout.actionsGap}
        sx={{ px: workspaceSpace.lg, pb: workspaceSpace.lg, justifyContent: 'flex-end' }}
      >
        <Button data-testid="avatar-crop-cancel" onClick={onCancel} disabled={submitting}>
          {t('common:action.cancel')}
        </Button>
        <Button
          data-testid="avatar-crop-confirm"
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={!ready || submitting}
        >
          {submitting ? t('common:action.saving') : t('settings:avatar.confirm')}
        </Button>
      </Stack>
    </Dialog>
  )
}
