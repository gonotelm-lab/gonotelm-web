import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SourceStatus } from '@/types/api'
import type { SourceListItem } from '../types/sourceTypes'

const sourceSelectionStorageKeyPrefix = 'notebook-source-selection'

const buildSourceSelectionStorageKey = (notebookId: string) =>
  `${sourceSelectionStorageKeyPrefix}:${notebookId}`

const parseStoredSelection = (rawValue: string | null): Record<string, boolean> => {
  if (!rawValue) return {}
  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') return {}
    const next: Record<string, boolean> = {}
    Object.entries(parsed as Record<string, unknown>).forEach(([sourceId, checked]) => {
      if (checked === true) {
        next[sourceId] = true
      }
    })
    return next
  } catch {
    return {}
  }
}

interface SourceSelectionControllerProps {
  notebookId: string
  sourceListItems: SourceListItem[]
  selectableSourceItems: SourceListItem[]
  selectedSourceIds: Record<string, boolean>
  isHydratingSources: boolean
  onSelectedSourceIdsChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

export function SourceSelectionController({
  notebookId,
  sourceListItems,
  selectableSourceItems,
  selectedSourceIds,
  isHydratingSources,
  onSelectedSourceIdsChange,
}: SourceSelectionControllerProps) {
  const previousStatusMapRef = useRef<Record<string, SourceStatus | undefined>>({})
  const skipPersistOnceRef = useRef(false)

  useEffect(() => {
    previousStatusMapRef.current = {}
    skipPersistOnceRef.current = true
    if (!notebookId) {
      onSelectedSourceIdsChange({})
      return
    }
    const storageKey = buildSourceSelectionStorageKey(notebookId)
    const persisted = parseStoredSelection(window.localStorage.getItem(storageKey))
    onSelectedSourceIdsChange(persisted)
  }, [notebookId, onSelectedSourceIdsChange])

  useEffect(() => {
    if (!notebookId) return
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false
      return
    }
    const storageKey = buildSourceSelectionStorageKey(notebookId)
    const persisted = Object.fromEntries(
      Object.entries(selectedSourceIds).filter(([, checked]) => Boolean(checked)),
    )
    if (Object.keys(persisted).length === 0) {
      window.localStorage.removeItem(storageKey)
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(persisted))
  }, [notebookId, selectedSourceIds])

  useEffect(() => {
    if (isHydratingSources || sourceListItems.length === 0) return

    const selectableIdSet = new Set(selectableSourceItems.map((item) => item.id))
    onSelectedSourceIdsChange((prev) => {
      const next: Record<string, boolean> = {}
      for (const sourceId of Object.keys(prev)) {
        if (prev[sourceId] && selectableIdSet.has(sourceId)) {
          next[sourceId] = true
        }
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((sourceId) => prev[sourceId] === next[sourceId])
      ) {
        return prev
      }
      return next
    })
  }, [isHydratingSources, onSelectedSourceIdsChange, selectableSourceItems, sourceListItems.length])

  useEffect(() => {
    const nextStatusMap: Record<string, SourceStatus | undefined> = {}
    sourceListItems.forEach((item) => {
      nextStatusMap[item.id] = item.status
    })

    const previousStatusMap = previousStatusMapRef.current
    if (Object.keys(previousStatusMap).length === 0) {
      previousStatusMapRef.current = nextStatusMap
      return
    }

    const autoCheckedIds = sourceListItems
      .filter(
        (item) =>
          item.status === 'ready' &&
          previousStatusMap[item.id] &&
          previousStatusMap[item.id] !== 'ready',
      )
      .map((item) => item.id)

    if (autoCheckedIds.length > 0) {
      onSelectedSourceIdsChange((prev) => {
        const next = { ...prev }
        autoCheckedIds.forEach((id) => {
          next[id] = true
        })
        return next
      })
    }

    previousStatusMapRef.current = nextStatusMap
  }, [onSelectedSourceIdsChange, sourceListItems])

  return null
}
