import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded'
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PictureInPictureAltRoundedIcon from '@mui/icons-material/PictureInPictureAltRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import VolumeDownRoundedIcon from '@mui/icons-material/VolumeDownRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'
import { useStudioVideoPlaybackStore } from './videoPlaybackStore'

interface StudioVideoPlayerProps {
  videoUrl: string
  title: string
  /** Shared playback session key (artifact id) so inline and overlay stay in sync. */
  playbackKey: string
  mode: 'inline' | 'overlay'
  onRetry?: () => void
}

const playbackRateOptions = [0.75, 1, 1.25, 1.5, 2] as const

function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function volumeIcon(value: number, muted: boolean) {
  if (muted || value === 0) return <VolumeOffRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
  if (value < 0.5) return <VolumeDownRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
  return <VolumeUpRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
}

export function StudioVideoPlayer({
  videoUrl,
  title,
  playbackKey,
  mode,
  onRetry,
}: StudioVideoPlayerProps) {
  const { t } = useTranslation(['studio', 'common'])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const seekingRef = useRef(false)
  const instanceId = useId()

  const sessionPlaying = useStudioVideoPlaybackStore(
    (state) => state.sessions[playbackKey]?.playing ?? false,
  )
  const sessionOwner = useStudioVideoPlaybackStore(
    (state) => state.sessions[playbackKey]?.ownerId ?? null,
  )

  const [volumeAnchorEl, setVolumeAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [speedAnchorEl, setSpeedAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(
    () => useStudioVideoPlaybackStore.getState().sessions[playbackKey]?.currentTime ?? 0,
  )
  const [seeking, setSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [muted, setMuted] = useState(
    () => useStudioVideoPlaybackStore.getState().sessions[playbackKey]?.muted ?? false,
  )
  const [volume, setVolume] = useState(
    () => useStudioVideoPlaybackStore.getState().sessions[playbackKey]?.volume ?? 1,
  )
  const [playbackRate, setPlaybackRate] = useState(
    () => useStudioVideoPlaybackStore.getState().sessions[playbackKey]?.playbackRate ?? 1,
  )
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [pictureInPicture, setPictureInPicture] = useState(false)
  const [prevVideoUrl, setPrevVideoUrl] = useState(videoUrl)

  if (videoUrl !== prevVideoUrl) {
    setPrevVideoUrl(videoUrl)
    setLoadError(false)
    setLoaded(false)
    setDuration(0)
    setPlaying(false)
    setCurrentTime(
      useStudioVideoPlaybackStore.getState().sessions[playbackKey]?.currentTime ?? 0,
    )
  }

  useEffect(() => {
    const store = useStudioVideoPlaybackStore.getState()
    const session = store.ensureSession(playbackKey)
    const video = videoRef.current
    if (video) {
      video.volume = session.volume
      video.muted = session.muted
      video.playbackRate = session.playbackRate
      if (Number.isFinite(session.currentTime) && session.currentTime > 0) {
        video.currentTime = session.currentTime
      }
      if (session.playing) {
        store.claimOwnership(playbackKey, instanceId)
      }
    }
    return () => {
      useStudioVideoPlaybackStore.getState().releaseOwnership(playbackKey, instanceId)
    }
  }, [instanceId, playbackKey])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const readSession = () => useStudioVideoPlaybackStore.getState().sessions[playbackKey]

    const onLoadedMetadata = () => {
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0
      setDuration(nextDuration)
      setLoaded(true)
      setLoadError(false)
      const session = readSession()
      if (
        session &&
        session.currentTime > 0 &&
        Math.abs(video.currentTime - session.currentTime) > 0.25
      ) {
        video.currentTime = session.currentTime
      }
      setCurrentTime(video.currentTime)
      useStudioVideoPlaybackStore
        .getState()
        .setProgress(playbackKey, video.currentTime, nextDuration)
    }
    const onTimeUpdate = () => {
      if (seekingRef.current) return
      setCurrentTime(video.currentTime)
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0
      useStudioVideoPlaybackStore
        .getState()
        .setProgress(playbackKey, video.currentTime, nextDuration)
    }
    const onPlay = () => {
      setPlaying(true)
      useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, true, instanceId)
    }
    const onPause = () => {
      setPlaying(false)
      const store = useStudioVideoPlaybackStore.getState()
      if (readSession()?.ownerId === instanceId) {
        store.setPlaying(playbackKey, false, instanceId)
      }
    }
    const onEnded = () => {
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0
      setPlaying(false)
      setCurrentTime(nextDuration)
      const store = useStudioVideoPlaybackStore.getState()
      if (readSession()?.ownerId === instanceId) {
        store.setPlaying(playbackKey, false, instanceId)
      }
      store.setProgress(playbackKey, nextDuration, nextDuration)
    }
    const onError = () => {
      setLoadError(true)
      setLoaded(false)
      setPlaying(false)
      const store = useStudioVideoPlaybackStore.getState()
      if (readSession()?.ownerId === instanceId) {
        store.setPlaying(playbackKey, false, instanceId)
      }
    }
    const onEnterPictureInPicture = () => setPictureInPicture(true)
    const onLeavePictureInPicture = () => setPictureInPicture(false)

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    video.addEventListener('enterpictureinpicture', onEnterPictureInPicture)
    video.addEventListener('leavepictureinpicture', onLeavePictureInPicture)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      video.removeEventListener('enterpictureinpicture', onEnterPictureInPicture)
      video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture)
    }
  }, [instanceId, playbackKey])

  // Keep at most one mounted player owning playback; the others mirror progress and pause.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !loaded) return

    const syncTimeFromStore = () => {
      const session = useStudioVideoPlaybackStore.getState().sessions[playbackKey]
      if (!session || !Number.isFinite(session.currentTime)) return
      if (Math.abs(video.currentTime - session.currentTime) > 0.5) {
        video.currentTime = session.currentTime
        setCurrentTime(session.currentTime)
      }
    }

    if (sessionPlaying) {
      if (sessionOwner === instanceId) {
        syncTimeFromStore()
        if (video.paused) {
          void video.play().catch(() => {
            useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, false, instanceId)
          })
        }
        return
      }
      if (sessionOwner === null) {
        syncTimeFromStore()
        useStudioVideoPlaybackStore.getState().claimOwnership(playbackKey, instanceId)
        return
      }
      if (!video.paused) {
        video.pause()
      }
      return
    }

    if (!video.paused) {
      video.pause()
    }
    syncTimeFromStore()
  }, [instanceId, loaded, playbackKey, sessionOwner, sessionPlaying])

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(stageRef.current) && document.fullscreenElement === stageRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const handleReload = useCallback(() => {
    const video = videoRef.current
    setLoadError(false)
    setLoaded(false)
    setDuration(0)
    setCurrentTime(0)
    setPlaying(false)
    if (video) {
      video.load()
    }
    useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, true, instanceId)
    void video?.play().catch(() => {
      useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, false, instanceId)
    })
    onRetry?.()
  }, [instanceId, onRetry, playbackKey])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (loadError) {
      handleReload()
      return
    }
    if (video.paused) {
      useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, true, instanceId)
      void video.play().catch(() => {
        useStudioVideoPlaybackStore.getState().setPlaying(playbackKey, false, instanceId)
      })
      return
    }
    video.pause()
  }, [handleReload, instanceId, loadError, playbackKey])

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (!video || !loaded) return
      const max = duration || (Number.isFinite(video.duration) ? video.duration : 0)
      const next = Math.min(Math.max(video.currentTime + delta, 0), max)
      video.currentTime = next
      setCurrentTime(next)
      useStudioVideoPlaybackStore.getState().setProgress(playbackKey, next, max || undefined)
    },
    [duration, loaded, playbackKey],
  )

  const applyVolume = useCallback(
    (value: number) => {
      const video = videoRef.current
      const next = Math.min(Math.max(value, 0), 1)
      if (video) {
        video.volume = next
        video.muted = next === 0
      }
      setVolume(next)
      setMuted(next === 0)
      useStudioVideoPlaybackStore.getState().setVolume(playbackKey, next, next === 0)
    },
    [playbackKey],
  )

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !muted
    video.muted = nextMuted
    setMuted(nextMuted)
    useStudioVideoPlaybackStore.getState().setVolume(playbackKey, video.volume, nextMuted)
  }, [muted, playbackKey])

  const handleToggleFullscreen = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined)
      return
    }
    void stage.requestFullscreen().catch(() => undefined)
  }, [])

  const handleStageKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          event.preventDefault()
          seekBy(-5)
          break
        case 'ArrowRight':
          event.preventDefault()
          seekBy(5)
          break
        case 'ArrowUp':
          event.preventDefault()
          applyVolume(volume + 0.05)
          break
        case 'ArrowDown':
          event.preventDefault()
          applyVolume(volume - 0.05)
          break
        case 'm':
        case 'M':
          handleToggleMute()
          break
        case 'f':
        case 'F':
          handleToggleFullscreen()
          break
        default:
          break
      }
    },
    [applyVolume, handlePlayPause, handleToggleFullscreen, handleToggleMute, seekBy, volume],
  )

  const handleStageClick = useCallback(() => {
    if (!loaded && !loadError) return
    handlePlayPause()
  }, [handlePlayPause, loadError, loaded])

  const handleSeekStart = useCallback(() => {
    seekingRef.current = true
    setSeeking(true)
    setSeekValue(currentTime)
  }, [currentTime])

  const handleSeekChange = useCallback((_event: Event, value: number | number[]) => {
    setSeekValue(value as number)
  }, [])

  const handleSeekCommit = useCallback(
    (_event: React.SyntheticEvent | Event, value: number | number[]) => {
      const video = videoRef.current
      const next = value as number
      seekingRef.current = false
      setSeeking(false)
      setCurrentTime(next)
      if (!video) return
      video.currentTime = next
      useStudioVideoPlaybackStore
        .getState()
        .setProgress(playbackKey, next, Number.isFinite(video.duration) ? video.duration : undefined)
    },
    [playbackKey],
  )

  const handleVolumeButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setVolumeAnchorEl((prev) => (prev ? null : event.currentTarget))
  }, [])

  const handleVolumeClose = useCallback(() => {
    setVolumeAnchorEl(null)
  }, [])

  const handleVolumeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      applyVolume(value as number)
    },
    [applyVolume],
  )

  const handleSpeedButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setSpeedAnchorEl(event.currentTarget)
  }, [])

  const handleSpeedClose = useCallback(() => {
    setSpeedAnchorEl(null)
  }, [])

  const handleSpeedSelect = useCallback(
    (rate: number) => {
      const video = videoRef.current
      if (video) {
        video.playbackRate = rate
      }
      setPlaybackRate(rate)
      useStudioVideoPlaybackStore.getState().setPlaybackRate(playbackKey, rate)
      setSpeedAnchorEl(null)
    },
    [playbackKey],
  )

  const handleTogglePictureInPicture = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
        return
      }
      await video.requestPictureInPicture()
    } catch {
      // Ignore unsupported or interrupted picture-in-picture requests.
    }
  }, [])

  const displayTime = seeking ? seekValue : currentTime
  const pictureInPictureSupported =
    typeof document !== 'undefined' && document.pictureInPictureEnabled

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: workspaceSpace.sm,
      }}
    >
      <Box
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label={title}
        onClick={handleStageClick}
        onKeyDown={handleStageKeyDown}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'common.black',
          borderRadius: mode === 'inline' ? workspaceRadius.md : 0,
          overflow: 'hidden',
          outline: 'none',
          cursor: loaded ? 'pointer' : 'default',
          '&:focus-visible': {
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
          },
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        >
          {t('studio:video.unsupported')}
        </video>

        {!loaded && !loadError ? (
          <Typography
            variant="caption"
            sx={{ position: 'absolute', color: 'common.white', pointerEvents: 'none' }}
          >
            {t('studio:video.loading')}
          </Typography>
        ) : null}

        {loaded && !playing && !loadError ? (
          <IconButton
            aria-label={t('studio:video.play')}
            onClick={(event) => {
              event.stopPropagation()
              handlePlayPause()
            }}
            sx={{
              position: 'absolute',
              width: 56,
              height: 56,
              bgcolor: alpha('#000000', 0.55),
              color: 'common.white',
              backdropFilter: 'blur(4px)',
              '&:hover': { bgcolor: alpha('#000000', 0.72) },
            }}
          >
            <PlayArrowRoundedIcon sx={{ fontSize: workspaceIconSize.xl }} />
          </IconButton>
        ) : null}

        {loadError ? (
          <Stack
            spacing={workspaceSpace.sm}
            sx={{
              position: 'absolute',
              alignItems: 'center',
              px: workspaceSpace.md,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: 'error.light' }}>
              {t('studio:video.interrupted')}
            </Typography>
            <Typography
              variant="caption"
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                handleReload()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleReload()
                }
              }}
              sx={{
                color: 'common.white',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                '&:hover': { color: 'primary.light' },
              }}
            >
              {t('studio:video.reload')}
            </Typography>
          </Stack>
        ) : null}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          flexShrink: 0,
          px: mode === 'overlay' ? workspaceSpace.md : 0,
          pb: mode === 'overlay' ? workspaceSpace.sm : 0,
        }}
      >
        <IconButton
          onClick={handlePlayPause}
          disabled={!loaded && !loadError}
          size="small"
          aria-label={playing ? t('studio:video.pause') : t('studio:video.play')}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            width: 28,
            height: 28,
            flexShrink: 0,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          {playing ? (
            <PauseRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
          ) : (
            <PlayArrowRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
          )}
        </IconButton>

        <Typography
          variant="caption"
          sx={{
            minWidth: 34,
            textAlign: 'right',
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
            mr: workspaceSpace.xxs,
          }}
        >
          {formatVideoTime(displayTime)}
        </Typography>

        <Slider
          size="small"
          min={0}
          max={duration || 1}
          step={0.1}
          value={displayTime}
          disabled={!loaded}
          onMouseDown={handleSeekStart}
          onTouchStart={handleSeekStart}
          onChange={handleSeekChange}
          onChangeCommitted={handleSeekCommit}
          sx={{ flex: 1, mx: 0, minWidth: 60 }}
        />

        <Typography
          variant="caption"
          sx={{ minWidth: 34, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatVideoTime(duration)}
        </Typography>

        <Tooltip title={muted || volume === 0 ? t('studio:video.unmute') : t('studio:video.volume')}>
          <IconButton
            size="small"
            onClick={handleVolumeButtonClick}
            sx={{ color: 'text.secondary', ml: workspaceSpace.xxs }}
          >
            {volumeIcon(volume, muted)}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('studio:video.speed')}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            aria-label={t('studio:video.speed')}
            onClick={handleSpeedButtonClick}
            sx={{
              minWidth: 0,
              px: workspaceSpace.xxs,
              py: 0,
              color: 'text.secondary',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.4,
            }}
          >
            {`${playbackRate}×`}
          </Button>
        </Tooltip>

        {pictureInPictureSupported ? (
          <Tooltip
            title={pictureInPicture ? t('studio:video.exitPip') : t('studio:video.pip')}
          >
            <IconButton
              size="small"
              aria-label={pictureInPicture ? t('studio:video.exitPip') : t('studio:video.pip')}
              onClick={handleTogglePictureInPicture}
              sx={{ color: 'text.secondary' }}
            >
              <PictureInPictureAltRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
            </IconButton>
          </Tooltip>
        ) : null}

        <Tooltip title={fullscreen ? t('studio:video.exitFullscreen') : t('studio:video.fullscreen')}>
          <IconButton
            size="small"
            aria-label={fullscreen ? t('studio:video.exitFullscreen') : t('studio:video.fullscreen')}
            onClick={handleToggleFullscreen}
            sx={{ color: 'text.secondary' }}
          >
            {fullscreen ? (
              <FullscreenExitRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
            ) : (
              <FullscreenRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      <Popover
        open={Boolean(volumeAnchorEl)}
        anchorEl={volumeAnchorEl}
        onClose={handleVolumeClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              bgcolor: 'transparent',
            },
          },
        }}
      >
        <Slider
          orientation="vertical"
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          sx={{ height: 100 }}
        />
      </Popover>

      <Menu
        anchorEl={speedAnchorEl}
        open={Boolean(speedAnchorEl)}
        onClose={handleSpeedClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {playbackRateOptions.map((rate) => (
          <MenuItem
            key={rate}
            selected={rate === playbackRate}
            onClick={() => handleSpeedSelect(rate)}
            sx={{ minWidth: 96 }}
          >
            <Typography variant="caption">
              {rate === 1 ? t('studio:video.speedNormal') : `${rate}×`}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
