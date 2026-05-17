import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownCodeProps {
  inline?: boolean
  className?: string
  children?: ReactNode
}

const detectLanguage = (className?: string) => {
  if (!className) return 'text'
  const matched = /language-([\w-]+)/i.exec(className)
  return matched?.[1] ?? 'text'
}

const codeInteractionTokens = {
  copyFeedbackDurationMs: 1200,
  actionIconSize: 15,
}

const codeFontFamily =
  "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

const inlineCodeTokens = {
  paddingX: 0.48,
  paddingY: 0.18,
  borderRadius: 0.75,
  fontSize: 13.2,
  lineHeight: 1.45,
}

const codeBlockLayoutTokens = {
  marginTop: 1.05,
  marginBottom: 3.2,
  borderRadius: 1.2,
  toolbarPaddingX: 1.1,
  toolbarPaddingY: 0.45,
  toolbarLanguageFontSize: 12.5,
  contentPadding: 1.25,
  contentFontSize: 13.4,
  contentLineHeight: 1.55,
}

/**
 * Copies rendered code text to clipboard with progressive fallback.
 * Uses Clipboard API first, then textarea+execCommand for older contexts.
 */
const copyToClipboard = async (content: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
    return
  }
  // Fallback keeps copy usable in environments where Clipboard API is unavailable.
  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('copy failed')
  }
}

/**
 * Renders markdown code in two modes:
 * - inline code chip for short snippets
 * - syntax-highlighted code block with copy feedback interaction
 */
export function MarkdownCode({ inline, className, children }: MarkdownCodeProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<number | null>(null)
  const codeText = useMemo(() => String(children ?? '').replace(/\n$/, ''), [children])
  const language = useMemo(() => detectLanguage(className), [className])

  useEffect(() => {
    return () => {
      // Clear pending feedback timer to avoid state updates after component unmount.
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = null
      }
    }
  }, [])

  if (inline || !className) {
    return (
      <Box
        component="code"
        sx={{
          px: inlineCodeTokens.paddingX,
          py: inlineCodeTokens.paddingY,
          borderRadius: inlineCodeTokens.borderRadius,
          bgcolor: 'action.selected',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: inlineCodeTokens.fontSize,
          lineHeight: inlineCodeTokens.lineHeight,
          fontFamily: codeFontFamily,
        }}
      >
        {children}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        mt: codeBlockLayoutTokens.marginTop,
        mb: codeBlockLayoutTokens.marginBottom,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: codeBlockLayoutTokens.borderRadius,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: codeBlockLayoutTokens.toolbarPaddingX,
          py: codeBlockLayoutTokens.toolbarPaddingY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontSize: codeBlockLayoutTokens.toolbarLanguageFontSize,
            color: 'text.secondary',
          }}
        >
          {language}
        </Typography>

        <Tooltip title={copied ? '已复制' : '复制'}>
          <span>
            <IconButton
              size="small"
              onClick={() => {
                void (async () => {
                  try {
                    await copyToClipboard(codeText)
                    setCopied(true)
                    // Reset the previous timer so rapid clicks always keep the latest feedback window.
                    if (copiedTimerRef.current !== null) {
                      window.clearTimeout(copiedTimerRef.current)
                    }
                    copiedTimerRef.current = window.setTimeout(() => {
                      setCopied(false)
                      copiedTimerRef.current = null
                    }, codeInteractionTokens.copyFeedbackDurationMs)
                  } catch {
                    setCopied(false)
                  }
                })()
              }}
              sx={{
                p: 0,
                borderRadius: 0,
                color: copied ? 'success.main' : 'text.disabled',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'transparent',
                  color: copied ? 'success.main' : 'text.secondary',
                },
              }}
            >
              {copied ? (
                <CheckIcon
                  sx={{
                    fontSize: codeInteractionTokens.actionIconSize,
                    color: 'success.main',
                  }}
                />
              ) : (
                <ContentCopyIcon sx={{ fontSize: codeInteractionTokens.actionIconSize }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          m: 0,
          p: codeBlockLayoutTokens.contentPadding,
          bgcolor: 'grey.100',
          overflowX: 'auto',
        }}
      >
        <SyntaxHighlighter
          language={language === 'text' ? undefined : language}
          style={oneLight}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontFamily: codeFontFamily,
            fontSize: codeBlockLayoutTokens.contentFontSize,
            lineHeight: codeBlockLayoutTokens.contentLineHeight,
          }}
          codeTagProps={{
            style: {
              fontFamily: codeFontFamily,
            },
          }}
          wrapLongLines
        >
          {codeText}
        </SyntaxHighlighter>
      </Box>
    </Box>
  )
}
