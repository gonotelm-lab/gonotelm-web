import { create } from 'zustand'
import type { SourceKind, SourceStatus } from '../types/api'

export interface SourceCard {
  id: string
  kind: SourceKind
  status?: SourceStatus
  title?: string
  textContent?: string
  urlContent?: string
  fileFormat?: string
  fileUrl?: string
}

export interface NotebookMeta {
  id: string
  name: string
  desc: string
  sourceCount: number
  iconUrl?: string
}

const createEmptyNotebookMeta = (): NotebookMeta => ({
  id: '',
  name: '',
  desc: '',
  sourceCount: 0,
})

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
    set((state) => ({
      sources: state.sources.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })),
  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((item) => item.id !== id),
    })),
  setSources: (sources) =>
    set({
      sources,
    }),
  setSourceStatus: (id, status) =>
    set((state) => ({
      sources: state.sources.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    })),
  setNotebookMeta: (notebookMeta) =>
    set({
      notebookMeta,
    }),
  patchNotebookMeta: (patch) =>
    set((state) => ({
      notebookMeta: {
        ...state.notebookMeta,
        ...patch,
      },
    })),
  reset: () =>
    set({
      sources: [],
      notebookMeta: createEmptyNotebookMeta(),
    }),
}))
