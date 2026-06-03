export type RageCategory =
  | 'bug'
  | 'lag'
  | 'frustration'
  | 'exploit'
  | 'ui_ux'
  | 'performance'
  | 'other'

export interface LogEntry {
  level: 'log' | 'warn' | 'error'
  message: string
  timestamp: number
  stack?: string
}

export interface Metrics {
  fps: number | null
  memory: number | null
  resolution: string
  browser: string
  os: string
  ping: number | null
  networkType: string | null
  networkDownlink: number | null
  jsHeapSize: number | null
  jsHeapLimit: number | null
}

export interface RagePayload {
  timestamp: string
  sessionId: string
  userId: string | null
  category: RageCategory
  comment: string
  logs: LogEntry[]
  metrics: Metrics
  screenshot: string | null
  page: string
  metadata: Record<string, unknown>
}

export interface Incident {
  id: string
  timestamp: string
  // backend retorna snake_case
  session_id: string
  user_id: string | null
  category: RageCategory
  comment: string
  logs: LogEntry[]
  fps: number | null
  ping_ms: number | null
  js_heap_mb: number | null
  screenshot_path: string | null
  replay_path: string | null
  fingerprint: string | null
  group_id: string | null
  page: string
  status: 'open' | 'investigating' | 'resolved'
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

export type RageState = 'idle' | 'triggered' | 'loading' | 'success' | 'error'
