import { create } from 'zustand'
import type { RageCategory, RageState, LogEntry } from '../types'

interface RageStore {
  state: RageState
  category: RageCategory
  comment: string
  pendingLogs: LogEntry[]
  lastIncidentId: string | null
  cooldownUntil: number | null

  setState: (s: RageState) => void
  setCategory: (c: RageCategory) => void
  setComment: (t: string) => void
  setPendingLogs: (logs: LogEntry[]) => void
  setLastIncidentId: (id: string) => void
  startCooldown: (ms?: number) => void
  isOnCooldown: () => boolean
  reset: () => void
}

export const useRageStore = create<RageStore>((set, get) => ({
  state: 'idle',
  category: 'bug',
  comment: '',
  pendingLogs: [],
  lastIncidentId: null,
  cooldownUntil: null,

  setState: (state) => set({ state }),
  setCategory: (category) => set({ category }),
  setComment: (comment) => set({ comment }),
  setPendingLogs: (pendingLogs) => set({ pendingLogs }),
  setLastIncidentId: (lastIncidentId) => set({ lastIncidentId }),
  startCooldown: (ms = 10000) => set({ cooldownUntil: Date.now() + ms }),
  isOnCooldown: () => {
    const { cooldownUntil } = get()
    return cooldownUntil !== null && Date.now() < cooldownUntil
  },
  reset: () =>
    set({ state: 'idle', category: 'bug', comment: '', pendingLogs: [], lastIncidentId: null }),
}))
