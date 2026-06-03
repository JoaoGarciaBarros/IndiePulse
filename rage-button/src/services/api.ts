import axios from 'axios'
import type { Incident, RagePayload } from '../types'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const RETRY_DELAYS = [1000, 2000, 4000]

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries > 0) {
      const delay = RETRY_DELAYS[RETRY_DELAYS.length - retries] ?? 4000
      await new Promise((r) => setTimeout(r, delay))
      return withRetry(fn, retries - 1)
    }
    throw err
  }
}

export const api = {
  submitRage: (payload: RagePayload) =>
    withRetry(() => client.post<{ id: string }>('/rage-trigger', payload)),

  getIncidents: (params?: {
    category?: string
    status?: string
    severity?: string
    search?: string
    page?: number
    limit?: number
  }) => client.get<{ incidents: Incident[]; total: number }>('/incidents', { params }),

  getIncident: (id: string) => client.get<Incident>(`/incidents/${id}`),

  getIncidentLogs: (id: string) => client.get<Incident['logs']>(`/incidents/${id}/logs`),

  getIncidentMetrics: (id: string) => client.get<Record<string, unknown>>(`/incidents/${id}/metrics`),
}

export const MOCK_INCIDENTS: Incident[] = Array.from({ length: 24 }, (_, i) => ({
  id: `inc-${i + 1}`,
  timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
  sessionId: `sess-${Math.random().toString(36).slice(2, 9)}`,
  userId: i % 3 === 0 ? null : `user-${(i % 5) + 1}`,
  category: (['bug', 'lag', 'frustration', 'exploit', 'ui_ux', 'performance', 'other'] as const)[
    i % 7
  ],
  comment: [
    'Game crashed after entering dungeon',
    'FPS drops to 5 near the market',
    'This boss is impossible to beat',
    'Player can clip through walls near spawn',
    'Inventory button does nothing on mobile',
    'Loading takes 3 minutes',
    '',
  ][i % 7],
  logs: [
    { level: 'error', message: 'TypeError: Cannot read property', timestamp: Date.now() - 5000 },
    { level: 'warn', message: 'FPS below threshold: 12', timestamp: Date.now() - 3000 },
    { level: 'log', message: 'Player entered zone: dungeon_01', timestamp: Date.now() - 1000 },
  ],
  metrics: {
    fps: [60, 45, 12, 58, 30, 55, 22][i % 7],
    memory: 8,
    resolution: '1920x1080',
    browser: 'Chrome 124',
    os: 'Windows 10/11',
    ping: [20, 80, 350, 15, 120, 45, 90][i % 7],
    networkType: 'wifi',
    networkDownlink: 50,
    jsHeapSize: 150,
    jsHeapLimit: 4096,
  },
  screenshot: null,
  page: ['/game', '/lobby', '/dungeon', '/market', '/inventory', '/loading', '/menu'][i % 7],
  metadata: { gameVersion: '0.9.2', buildId: 'build-442' },
  status: (['open', 'investigating', 'resolved'] as const)[i % 3],
  severity: (['low', 'medium', 'high', 'critical'] as const)[i % 4],
}))
