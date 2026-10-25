import { create } from 'zustand'
import type { SourceKind, SourceStatus } from '../types/api'
import { notifyReadyTransitions } from './sourceCompletionNotification'

export interface SourceCard {
  id: string
  kind: SourceKind
  status?: SourceStatus
  title?: string
  textContent?: string
  urlContent?: string
  fileFormat?: string
  fileUrl?: string
  parsedContentUrl?: string
}

export interface NotebookMeta {
  id: string
  name: string
  /** 仅自定义摘要；未开启自定义时为空。 */
  desc: string
  customizeDescription: boolean
  sourceCount: number
  /** 当前生效封面直链；无封面时为 undefined。对话框上传/删除后会同步到这里。 */
  coverUrl?: string
}

const createEmptyNotebookMeta = (): NotebookMeta => ({
  id: '',
  name: '',
  desc: '',
  customizeDescription: false,
  sourceCount: 0,
})

/**
 * SourceCard 上参与“内容是否变化”判断的字段。
 * `satisfies Record<keyof SourceCard, true>` 是编译期守卫：SourceCard 新增字段而这里没补，会直接报错。
 */
const sourceCardComparableFlags = {
  id: true,
  kind: true,
  status: true,
  title: true,
  textContent: true,
  urlContent: true,
  fileFormat: true,
  fileUrl: true,
  parsedContentUrl: true,
} satisfies Record<keyof SourceCard, true>

const sourceCardComparableKeys = Object.keys(sourceCardComparableFlags) as Array<keyof SourceCard>

const isSameSourceCard = (prev: SourceCard | undefined, next: SourceCard) => {
  if (!prev) return false
  return sourceCardComparableKeys.every((key) => prev[key] === next[key])
}

/**
 * setSources 往往带着一整套新建对象进来（轮询重新水合、列表刷新）。
 * 这里在 store 内部消化掉等价变更：内容没变的卡片复用旧对象，全部没变时直接返回旧数组。
 * zustand 在 set 返回原 state 时不会通知订阅者，于是来源列表及其派生值
 * （选中 / 就绪 id 列表）在数据等价时保持引用相等，渲染期就不必再用 ref 缓存做身份守卫。
 */
const ensureSourceCardIdentity = (prev: SourceCard[], next: SourceCard[]): SourceCard[] => {
  if (prev === next) return prev
  if (prev.length !== next.length) return next
  let reusedAll = true
  const merged = next.map((item, index) => {
    const current = prev[index]
    if (isSameSourceCard(current, item)) {
      return current
    }
    reusedAll = false
    return item
  })
  return reusedAll ? prev : merged
}

interface WorkspaceStore {
  sources: SourceCard[]
  notebookMeta: NotebookMeta
  addSource: (source: SourceCard) => void
  patchSource: (id: string, patch: Partial<SourceCard>) => void
  removeSource: (id: string) => void
  setSources: (sources: SourceCard[]) => void
  setSourceStatus: (id: string, status: SourceStatus) => void
  setNotebookMeta: (notebookMeta: NotebookMeta) => void
  patchNotebookMeta: (patch: Partial<NotebookMeta>) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  sources: [],
  notebookMeta: createEmptyNotebookMeta(),
  addSource: (source) =>
    set((state) => ({
      sources: [source, ...state.sources.filter((item) => item.id !== source.id)],
    })),
  patchSource: (id, patch) =>
    set((state) => {
      const index = state.sources.findIndex((item) => item.id === id)
      if (index < 0) {
        return state
      }
      const current = state.sources[index]
      const next = { ...current, ...patch }
      const unchanged = (Object.keys(patch) as Array<keyof SourceCard>).every(
        (key) => current[key] === next[key],
      )
      if (unchanged) {
        return state
      }
      const sources = state.sources.slice()
      sources[index] = next
      notifyReadyTransitions(state.sources, sources)
      return { sources }
    }),
  removeSource: (id) =>
    set((state) => {
      if (!state.sources.some((item) => item.id === id)) {
        return state
      }
      return {
        sources: state.sources.filter((item) => item.id !== id),
      }
    }),
  setSources: (sources) =>
    set((state) => {
      const nextSources = ensureSourceCardIdentity(state.sources, sources)
      if (nextSources === state.sources) {
        return state
      }
      // ready 可能绕过轮询（列表刷新/水合覆盖），所以通知在状态转换的汇聚点做。
      notifyReadyTransitions(state.sources, nextSources)
      return { sources: nextSources }
    }),
  setSourceStatus: (id, status) =>
    set((state) => {
      const index = state.sources.findIndex((item) => item.id === id)
      if (index < 0) {
        return state
      }
      const current = state.sources[index]
      if (current.status === status) {
        return state
      }
      const sources = state.sources.slice()
      sources[index] = { ...current, status }
      notifyReadyTransitions(state.sources, sources)
      return { sources }
    }),
  setNotebookMeta: (notebookMeta) =>
    set({
      notebookMeta,
    }),
  patchNotebookMeta: (patch) =>
    set((state) => {
      const next = {
        ...state.notebookMeta,
        ...patch,
      }
      const unchanged = (Object.keys(patch) as Array<keyof NotebookMeta>).every(
        (key) => state.notebookMeta[key] === next[key],
      )
      if (unchanged) {
        return state
      }
      return { notebookMeta: next }
    }),
  reset: () =>
    set({
      sources: [],
      notebookMeta: createEmptyNotebookMeta(),
    }),
}))
