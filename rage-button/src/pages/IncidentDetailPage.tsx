import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import { Timeline } from '../components/Timeline'
import type { Incident } from '../types'

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug', lag: '⚡ Lag', frustration: '😤 Frustração',
  exploit: '🔓 Exploit', ui_ux: '🎨 UI/UX', performance: '📊 Performance', other: '❓ Outro',
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [logs, setLogs] = useState<Incident['logs']>([])
  const [metrics, setMetrics] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.getIncident(id),
      api.getIncidentLogs(id),
      api.getIncidentMetrics(id),
    ]).then(([incRes, logsRes, metricsRes]) => {
      setIncident(incRes.data)
      setLogs(logsRes.data)
      setMetrics(metricsRes.data)
    }).catch(() => setError('Incident não encontrado ou backend offline.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-600 text-sm">Carregando...</div>
  if (error || !incident) return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      <div className="text-center">
        <div className="text-6xl mb-4">404</div>
        <p className="mb-4 text-sm">{error ?? 'Incident não encontrado.'}</p>
        <Link to="/dashboard" className="text-red-500 hover:text-red-400 text-sm">← Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="text-gray-600 hover:text-gray-400 text-sm mb-6 inline-block transition-colors">
        ← Dashboard
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-100">
            {CATEGORY_LABELS[incident.category] ?? incident.category}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {new Date(incident.timestamp).toLocaleString('pt-BR')} · {incident.page}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge label={incident.status} color={statusColor(incident.status)} />
          <Badge label={incident.severity} color={severityColor(incident.severity)} />
        </div>
      </div>

      {incident.comment && (
        <Section title="Comentário do usuário">
          <p className="text-gray-300 bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm italic">
            "{incident.comment}"
          </p>
        </Section>
      )}

      <Section title="Métricas">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="FPS" value={incident.fps !== null ? `${incident.fps}` : '—'} highlight={fpsHighlight(incident.fps)} />
          <Metric label="Ping" value={incident.ping_ms !== null ? `${incident.ping_ms}ms` : '—'} highlight={pingHighlight(incident.ping_ms)} />
          <Metric label="JS Heap" value={incident.js_heap_mb !== null ? `${incident.js_heap_mb}MB` : '—'} />
          {Object.entries(metrics).map(([k, v]) =>
            !['fps','ping','jsHeapSize','jsHeapLimit','memory'].includes(k) && v != null
              ? <Metric key={k} label={k} value={String(v)} />
              : null
          )}
        </div>
      </Section>

      <Section title="Session">
        <div className="text-xs font-mono text-gray-500 space-y-1 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div><span className="text-gray-700">id:</span> <span className="text-gray-300">{incident.id}</span></div>
          <div><span className="text-gray-700">sessionId:</span> <span className="text-gray-300">{incident.session_id}</span></div>
          {incident.user_id && <div><span className="text-gray-700">userId:</span> <span className="text-gray-300">{incident.user_id}</span></div>}
          <div><span className="text-gray-700">fingerprint:</span> <span className="text-gray-300">{incident.fingerprint ?? '—'}</span></div>
        </div>
      </Section>

      {logs.length > 0 && (
        <Section title="Timeline Sincronizada">
          <Timeline logs={logs} rageTimestamp={incident.timestamp as unknown as string} />
        </Section>
      )}

      {logs.length > 0 && (
        <Section title="Console Logs">
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-1 max-h-64 overflow-y-auto scrollbar-dark">
            {logs.map((log, i) => (
              <div key={i} className={`text-xs font-mono ${logColor(log.level)}`}>
                <span className="text-gray-700 mr-2">[{log.level.toUpperCase()}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Screenshot">
        {incident.screenshot_path ? (
          <img
            src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/incidents/${incident.id}/screenshot`}
            alt="screenshot"
            className="w-full rounded-lg border border-gray-800"
          />
        ) : (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-lg p-8 text-center text-gray-700 text-sm">
            Screenshot não disponível para este incident.
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-6"><h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">{title}</h2>{children}</div>
}
function Metric({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-bold ${highlight ?? 'text-gray-300'}`}>{value}</div>
    </div>
  )
}
function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${color}`}>{label}</span>
}
function logColor(level: string) { return level === 'error' ? 'text-red-400' : level === 'warn' ? 'text-yellow-400' : 'text-gray-400' }
function statusColor(s: string) { return s === 'open' ? 'text-red-400 border-red-700' : s === 'investigating' ? 'text-yellow-400 border-yellow-700' : 'text-green-400 border-green-700' }
function severityColor(s: string) { return s === 'critical' ? 'text-red-300 border-red-800' : s === 'high' ? 'text-orange-300 border-orange-800' : s === 'medium' ? 'text-yellow-300 border-yellow-800' : 'text-gray-400 border-gray-700' }
function fpsHighlight(fps: number | null) { return fps === null ? undefined : fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400' }
function pingHighlight(ping: number | null) { return ping === null ? undefined : ping <= 50 ? 'text-green-400' : ping <= 150 ? 'text-yellow-400' : 'text-red-400' }
