import { beforeEach, describe, expect, it } from 'vitest'
import { useStudioVideoPlaybackStore } from './videoPlaybackStore'

const getSession = (key: string) =>
  useStudioVideoPlaybackStore.getState().sessions[key]

describe('useStudioVideoPlaybackStore', () => {
  beforeEach(() => {
    useStudioVideoPlaybackStore.setState({ sessions: {} })
  })

  it('creates a session lazily with defaults', () => {
    const session = useStudioVideoPlaybackStore.getState().ensureSession('artifact-1')

    expect(session).toEqual({
      currentTime: 0,
      duration: 0,
      playing: false,
      ownerId: null,
      volume: 1,
      muted: false,
      playbackRate: 1,
    })
    expect(getSession('artifact-1')).toEqual(session)
  })

  it('reuses the existing session on repeated ensureSession calls', () => {
    const store = useStudioVideoPlaybackStore.getState()
    const first = store.ensureSession('artifact-1')
    store.setProgress('artifact-1', 12.5, 60)
    const second = store.ensureSession('artifact-1')

    expect(second).toBe(getSession('artifact-1'))
    expect(second.currentTime).toBe(12.5)
    expect(second.duration).toBe(60)
    expect(first).not.toBe(second)
  })

  it('records progress without changing ownership', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setPlaying('artifact-1', true, 'player-a')
    store.setProgress('artifact-1', 30, 120)

    expect(getSession('artifact-1')).toMatchObject({
      currentTime: 30,
      duration: 120,
      playing: true,
      ownerId: 'player-a',
    })
  })

  it('keeps duration when progress omits it', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setProgress('artifact-1', 10, 90)
    store.setProgress('artifact-1', 42)

    expect(getSession('artifact-1')).toMatchObject({
      currentTime: 42,
      duration: 90,
    })
  })

  it('clears ownership when playback pauses', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setPlaying('artifact-1', true, 'player-a')
    store.setPlaying('artifact-1', false, 'player-a')

    expect(getSession('artifact-1')).toMatchObject({
      playing: false,
      ownerId: null,
    })
  })

  it('keeps playback alive when the owner releases ownership', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setPlaying('artifact-1', true, 'player-a')
    store.releaseOwnership('artifact-1', 'player-a')

    expect(getSession('artifact-1')).toMatchObject({
      playing: true,
      ownerId: null,
    })
  })

  it('ignores releaseOwnership from a non-owner', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setPlaying('artifact-1', true, 'player-a')
    store.releaseOwnership('artifact-1', 'player-b')

    expect(getSession('artifact-1')).toMatchObject({
      playing: true,
      ownerId: 'player-a',
    })
  })

  it('lets another player claim ownership while playing', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setPlaying('artifact-1', true, 'player-a')
    store.claimOwnership('artifact-1', 'player-b')

    expect(getSession('artifact-1')).toMatchObject({
      playing: true,
      ownerId: 'player-b',
    })
  })

  it('does not claim ownership while paused', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.claimOwnership('artifact-1', 'player-a')

    expect(getSession('artifact-1')).toMatchObject({
      playing: false,
      ownerId: null,
    })
  })

  it('stores volume, mute and playback rate', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.ensureSession('artifact-1')
    store.setVolume('artifact-1', 0.4, false)
    store.setPlaybackRate('artifact-1', 1.5)

    expect(getSession('artifact-1')).toMatchObject({
      volume: 0.4,
      muted: false,
      playbackRate: 1.5,
    })
  })

  it('no-ops updates for unknown sessions', () => {
    const store = useStudioVideoPlaybackStore.getState()
    store.setProgress('missing', 10)
    store.setPlaying('missing', true, 'player-a')
    store.setVolume('missing', 0.2, true)
    store.setPlaybackRate('missing', 2)
    store.releaseOwnership('missing', 'player-a')

    expect(getSession('missing')).toBeUndefined()
  })
})
