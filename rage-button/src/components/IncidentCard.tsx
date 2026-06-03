import type { Incident } from '../types'
import { Link } from 'react-router-dom'

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  lag: '⚡ Lag',
  frustration: '😤 Frustração',
  exploit: '🔓 Exploit',
  ui_ux: '🎨 UI/UX',
  performance: '📊 Performance',
  other: '❓ Outro',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'text-red-400 border-red-700',
  investigating: 'text-yellow-400 border-yellow-700',
  resolved: 'text-green-400 border-green-700',
}

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300',
  medium: 'bg-yellow-900 text-yellow-300',
  high: 'bg-orange-900 text-orange-300',
  critical: 'bg-red-900 text-red-300',
}

export function IncidentCard({ incident }: { incident: Incident }) {
  const ago = formatAgo(incident.timestamp)

  return (
    <Link
      to={`/dashboard/${incident.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-red-800 transition-colors duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-200">
            {CATEGORY_LABELS[incident.category] ?? incident.category}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[incident.status]}`}>
            {incident.status}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${SEVERITY_COLOR[incident.severity]}`}>
            {incident.severity}
          </span>
        </div>
        <span className="text-xs text-gray-600 whitespace-nowrap">{ago}</span>
      </div>

      {incident.comment && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">"{incident.comment}"</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        <span>FPS: <span className={getFPSColor(incident.fps)}>{incident.fps ?? '—'}</span></span>
        <span>PING: <span className={getPingColor(incident.ping_ms)}>{incident.ping_ms != null ? `${incident.ping_ms}ms` : '—'}</span></span>
        <span>{incident.page}</span>
        {incident.user_id && <span>user:{incident.user_id}</span>}
        <span className="ml-auto text-gray-700 group-hover:text-red-600 transition-colors">→</span>
      </div>
    </Link>
  )
}

function getFPSColor(fps: number | null): string {
  if (fps === null) return 'text-gray-500'
  if (fps >= 50) return 'text-green-400'
  if (fps >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

function getPingColor(ping: number | null): string {
  if (ping === null) return 'text-gray-500'
  if (ping <= 50) return 'text-green-400'
  if (ping <= 150) return 'text-yellow-400'
  return 'text-red-400'
}

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}
