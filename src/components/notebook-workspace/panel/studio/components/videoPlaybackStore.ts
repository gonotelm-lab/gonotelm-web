import { create } from 'zustand'

export interface StudioVideoPlaybackSession {
  currentTime: number
  duration: number
  playing: boolean
  /** Instance id of the player element that currently owns playback. */
  ownerId: string | null
  volume: number
  muted: boolean
  playbackRate: number
}

interface StudioVideoPlaybackStore {
  sessions: Record<string, StudioVideoPlaybackSession>
  ensureSession: (key: string) => StudioVideoPlaybackSession
  setProgress: (key: string, currentTime: number, duration?: number) => void
  setPlaying: (key: string, playing: boolean, ownerId: string) => void
  claimOwnership: (key: string, ownerId: string) => void
  releaseOwnership: (key: string, ownerId: string) => void
  setVolume: (key: string, volume: number, muted: boolean) => void
  setPlaybackRate: (key: string, playbackRate: number) => void
}

const createEmptySession = (): StudioVideoPlaybackSession => ({
  currentTime: 0,
  duration: 0,
  playing: false,
  ownerId: null,
  volume: 1,
  muted: false,
  playbackRate: 1,
})

export const useStudioVideoPlaybackStore = create<StudioVideoPlaybackStore>((set, get) => ({
  sessions: {},
  ensureSession: (key) => {
    const existing = get().sessions[key]
    if (existing) {
      return existing
    }
    const session = createEmptySession()
    set((state) => ({
      sessions: {
        ...state.sessions,
        [key]: session,
      },
    }))
    return session
  },
  setProgress: (key, currentTime, duration) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session) {
        return state
      }
      const nextDuration = duration ?? session.duration
      if (session.currentTime === currentTime && session.duration === nextDuration) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            currentTime,
            duration: nextDuration,
          },
        },
      }
    }),
  setPlaying: (key, playing, ownerId) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session) {
        return state
      }
      const nextOwnerId = playing ? ownerId : null
      if (session.playing === playing && session.ownerId === nextOwnerId) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            playing,
            ownerId: nextOwnerId,
          },
        },
      }
    }),
  claimOwnership: (key, ownerId) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session || !session.playing || session.ownerId === ownerId) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            ownerId,
          },
        },
      }
    }),
  releaseOwnership: (key, ownerId) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session || session.ownerId !== ownerId) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            ownerId: null,
          },
        },
      }
    }),
  setVolume: (key, volume, muted) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session || (session.volume === volume && session.muted === muted)) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            volume,
            muted,
          },
        },
      }
    }),
  setPlaybackRate: (key, playbackRate) =>
    set((state) => {
      const session = state.sessions[key]
      if (!session || session.playbackRate === playbackRate) {
        return state
      }
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            playbackRate,
          },
        },
      }
    }),
}))
