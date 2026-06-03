import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { IncidentCard } from '../components/IncidentCard'
import type { Incident, RageCategory } from '../types'

const CATEGORIES: { value: RageCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'lag', label: '⚡ Lag' },
  { value: 'frustration', label: '😤 Frustração' },
  { value: 'exploit', label: '🔓 Exploit' },
  { value: 'ui_ux', label: '🎨 UI/UX' },
  { value: 'performance', label: '📊 Performance' },
  { value: 'other', label: '❓ Outro' },
]

const STATUSES = ['all', 'open', 'investigating', 'resolved'] as const
const SEVERITIES = ['all', 'low', 'medium', 'high', 'critical'] as const

export function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<RageCategory | 'all'>('all')
  const [status, setStatus] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 9

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getIncidents({
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        severity: severity !== 'all' ? severity : undefined,
        search: search || undefined,
        page,
        limit,
      })
      setIncidents(res.data.incidents)
      setTotal(res.data.total)
    } catch {
      setError('Não foi possível carregar os incidents. Backend offline?')
    } finally {
      setLoading(false)
    }
  }, [category, status, severity, search, page])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  // Auto-refresh a cada 10s
  useEffect(() => {
    const id = setInterval(fetchIncidents, 10000)
    return () => clearInterval(id)
  }, [fetchIncidents])

  const totalPages = Math.ceil(total / limit)

  const stats = {
    total,
    open: incidents.filter((i) => i.status === 'open').length,
    critical: incidents.filter((i) => i.severity === 'critical').length,
    avgFps: incidents.filter((i) => i.fps !== null).length
      ? Math.round(incidents.filter((i) => i.fps !== null).reduce((s, i) => s + (i.fps ?? 0), 0) / incidents.filter((i) => i.fps !== null).length)
      : null,
  }

  const changeFilter = (fn: () => void) => { fn(); setPage(1) }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-red-500 mb-1">Dashboard</h1>
          <p className="text-gray-600 text-sm">Incidents reportados via Rage Trigger</p>
        </div>
        <button
          onClick={fetchIncidents}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        >
          ↻ Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={total} color="text-gray-300" />
        <StatCard label="Abertos" value={stats.open} color="text-red-400" />
        <StatCard label="Críticos" value={stats.critical} color="text-orange-400" />
        <StatCard label="FPS Médio" value={stats.avgFps !== null ? `${stats.avgFps}` : '—'} color="text-green-400" />
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por comentário, página, usuário..."
          value={search}
          onChange={(e) => changeFilter(() => setSearch(e.target.value))}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => changeFilter(() => setCategory(c.value))}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${category === c.value ? 'bg-red-700 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => changeFilter(() => setStatus(s))}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors capitalize ${status === s ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}>
              {s === 'all' ? 'Todos status' : s}
            </button>
          ))}
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => changeFilter(() => setSeverity(s))}
              className={`px-3 py-1 rounded text-xs font-bold border transition-colors capitalize ${severity === s ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}>
              {s === 'all' ? 'Todas severidades' : s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-red-400 text-sm mb-4">{error}</div>
      )}

      <div className="text-xs text-gray-600 mb-3">
        {loading ? 'Carregando...' : `${total} incident${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {loading && incidents.length === 0 && (
          <div className="col-span-3 text-center text-gray-700 py-16 text-sm">Carregando...</div>
        )}
        {!loading && incidents.length === 0 && !error && (
          <div className="col-span-3 text-center text-gray-700 py-16 text-sm">Nenhum incident ainda. Aperta o botão RAGE!</div>
        )}
        {incidents.map((inc) => <IncidentCard key={inc.id} incident={inc} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors">
            ← Anterior
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors">
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}
