import { extractLatestPhaseSummary } from './streamEventReducer'
import type { ChatUiFragment, ChatUiFragmentType, ChatUiMessage } from './types'

export const THINKING_PHASE_LABEL = '思考中...'

export const normalizeFragmentType = (type: string): ChatUiFragmentType | null => {
  const normalized = type.toUpperCase()
  if (
    normalized === 'REQUEST' ||
    normalized === 'THINK' ||
    normalized === 'PHASE' ||
    normalized === 'RESPONSE'
  ) {
    return normalized
  }
  return null
}

export const extractCombinedResponseContent = (fragments: ChatUiFragment[]) =>
  fragments
    .filter((fragment) => normalizeFragmentType(fragment.type) === 'RESPONSE')
    .map((fragment) => fragment.response?.content ?? '')
    .join('\n')

export const hasResponseContent = (fragments: ChatUiFragment[]) =>
  Boolean(extractCombinedResponseContent(fragments).trim())

export const resolvePhaseStatusLabel = (message: ChatUiMessage) =>
  extractLatestPhaseSummary(message) || THINKING_PHASE_LABEL

export const shouldShowPhaseStatus = ({
  isActiveAssistant,
  fragments,
}: {
  isActiveAssistant?: boolean
  fragments: ChatUiFragment[]
}) => Boolean(isActiveAssistant && !hasResponseContent(fragments))

export const resolveStickyPhaseStatusLabel = (
  message: ChatUiMessage,
  previousLabel: string,
  enabled: boolean,
) => {
  if (!enabled) {
    return THINKING_PHASE_LABEL
  }

  const latestPhase = extractLatestPhaseSummary(message)
  if (latestPhase) {
    return latestPhase
  }

  if (previousLabel !== THINKING_PHASE_LABEL) {
    return previousLabel
  }

  return THINKING_PHASE_LABEL
}
