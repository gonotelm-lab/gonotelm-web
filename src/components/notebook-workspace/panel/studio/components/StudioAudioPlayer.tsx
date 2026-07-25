import { useCallback, useEffect, useRef, useState } from 'react'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import VolumeDownRoundedIcon from '@mui/icons-material/VolumeDownRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import {
  Box,
  IconButton,
  Popover,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

interface StudioAudioPlayerProps {
  audioUrl: string
  title: string
  onDownload?: () => void
  onRetry?: () => void
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function volumeIcon(value: number, muted: boolean) {
  if (muted || value === 0) return <VolumeOffRoundedIcon sx={{ fontSize: 19 }} />
  if (value < 0.5) return <VolumeDownRoundedIcon sx={{ fontSize: 19 }} />
  return <VolumeUpRoundedIcon sx={{ fontSize: 19 }} />
}

export function StudioAudioPlayer({ audioUrl, title, onDownload, onRetry }: StudioAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const volumeAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)

  useEffect(() => {
    setLoadError(false)
    setLoaded(false)
    setDuration(0)
    setCurrentTime(0)
    setPlaying(false)
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setLoaded(true)
      void audio.play()
    }
    const onTimeUpdate = () => {
      if (!seeking) {
        setCurrentTime(audio.currentTime)
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }
    const onError = () => setLoadError(true)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [seeking])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }

    if (loadError) {
      setLoadError(false)
      setLoaded(false)
      setDuration(0)
      setCurrentTime(0)
      audio.load()
    }

    void audio.play()
  }, [loadError, playing])

  const handleSeekStart = useCallback(() => {
    setSeeking(true)
    setSeekValue(currentTime)
  }, [currentTime])

  const handleSeekChange = useCallback((_event: Event, value: number | number[]) => {
    setSeekValue(value as number)
  }, [])

  const handleSeekCommit = useCallback(
    (_event: React.SyntheticEvent | Event, value: number | number[]) => {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = value as number
      setCurrentTime(value as number)
      setSeeking(false)
    },
    [],
  )

  const handleVolumeButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setVolumeOpen((prev) => !prev)
    },
    [],
  )

  const handleVolumeClose = useCallback(() => {
    setVolumeOpen(false)
  }, [])

  const handleVolumeChange = useCallback((_event: Event, value: number | number[]) => {
    const audio = audioRef.current
    if (!audio) return
    const vol = value as number
    audio.volume = vol
    audio.muted = vol === 0
    setVolume(vol)
    setMuted(vol === 0)
  }, [])

  const displayTime = seeking ? seekValue : currentTime

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        p: 0,
      }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Stack sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
              {title}
            </Typography>
            {loadError ? (
              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="error">
                  播放中断
                </Typography>
                {onRetry ? (
                  <Typography
                    variant="caption"
                    onClick={() => {
                      handlePlayPause()
                      onRetry()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handlePlayPause()
                        onRetry()
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                      '&:hover': { color: 'primary.dark' },
                    }}
                  >
                    重新加载
                  </Typography>
                ) : null}
              </Stack>
            ) : !loaded ? (
              <Typography variant="caption" color="text.secondary">
                加载中…
              </Typography>
            ) : null}
          </Stack>

          {onDownload ? (
            <Tooltip title="下载音频">
              <IconButton size="small" onClick={onDownload}>
                <DownloadRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton
            onClick={handlePlayPause}
            disabled={!loaded && !loadError}
            size="small"
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
              <PauseRoundedIcon sx={{ fontSize: 18 }} />
            ) : (
              <PlayArrowRoundedIcon sx={{ fontSize: 18, ml: 0.15 }} />
            )}
          </IconButton>

          <Typography
            variant="caption"
            sx={{ minWidth: 30, textAlign: 'right', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', mr: 0.5 }}
          >
            {formatAudioTime(displayTime)}
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
            sx={{ flex: 1, mx: 0 }}
          />

          <Typography
            variant="caption"
            sx={{ minWidth: 32, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatAudioTime(duration)}
          </Typography>

          <Tooltip title={muted || volume === 0 ? '取消静音' : '音量'}>
            <IconButton
              ref={volumeAnchorRef}
              size="small"
              onClick={handleVolumeButtonClick}
              sx={{ color: 'text.secondary', ml: 0.3 }}
            >
              {volumeIcon(volume, muted)}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Popover
        open={volumeOpen}
        anchorEl={volumeAnchorRef.current}
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
    </Box>
  )
}
