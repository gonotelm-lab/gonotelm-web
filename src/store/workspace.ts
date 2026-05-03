import { create } from 'zustand'
import type { SourceKind, SourceStatus } from '../types/api'

export interface SourceCard {
  id: string
  kind: SourceKind
  status?: SourceStatus
  displayName?: string
  textContent?: string
  urlContent?: string
  fileUrl?: string
}

interface WorkspaceStore {
  sources: SourceCard[]
  addSource: (source: SourceCard) => void
  patchSource: (id: string, patch: Partial<SourceCard>) => void
  removeSource: (id: string) => void
  setSources: (sources: SourceCard[]) => void
  setSourceStatus: (id: string, status: SourceStatus) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  sources: [],
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
  reset: () => set({ sources: [] }),
}))
