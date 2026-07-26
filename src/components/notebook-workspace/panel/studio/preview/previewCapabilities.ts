import type { StudioArtifactKind } from '@/types/api'

export interface StudioArtifactPreviewCapability {
  inline: boolean
  overlay: boolean
}

const defaultPreviewCapability: StudioArtifactPreviewCapability = {
  inline: false,
  overlay: true,
}

const previewCapabilityByKind: Partial<Record<StudioArtifactKind, StudioArtifactPreviewCapability>> = {
  mindmap: {
    inline: true,
    overlay: true,
  },
  report: {
    inline: true,
    overlay: true,
  },
  info_graphic: {
    inline: false,
    overlay: true,
  },
  audio_overview: {
    inline: true,
    overlay: false,
  },
  flashcard: {
    inline: true,
    overlay: true,
  },
  quiz: {
    inline: false,
    overlay: true,
  },
}

export const getStudioArtifactPreviewCapability = (
  kind: StudioArtifactKind,
): StudioArtifactPreviewCapability => {
  const configured = previewCapabilityByKind[kind]
  if (!configured) {
    return defaultPreviewCapability
  }
  return configured
}
