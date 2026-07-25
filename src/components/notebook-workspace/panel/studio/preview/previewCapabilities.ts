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
