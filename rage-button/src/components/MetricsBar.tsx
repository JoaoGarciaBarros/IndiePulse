import { useEffect, useState } from 'react'
import { collectMetrics } from '../utils/metrics'
import type { Metrics } from '../types'

export function MetricsBar() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    collectMetrics().then(setMetrics)
    const interval = setInterval(() => collectMetrics().then(setMetrics), 2000)
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null

  const fpsColor =
    metrics.fps === null
      ? 'text-gray-500'
      : metrics.fps >= 50
      ? 'text-green-400'
      : metrics.fps >= 30
      ? 'text-yellow-400'
      : 'text-red-400'

  const pingColor =
    metrics.ping === null
      ? 'text-gray-500'
      : metrics.ping <= 50
      ? 'text-green-400'
      : metrics.ping <= 150
      ? 'text-yellow-400'
      : 'text-red-400'

  return (
    <div className="flex flex-wrap gap-3 justify-center text-xs font-mono">
      <Stat label="FPS" value={metrics.fps !== null ? `${metrics.fps}` : '—'} className={fpsColor} />
      <Stat label="PING" value={metrics.ping !== null ? `${metrics.ping}ms` : '—'} className={pingColor} />
      <Stat label="RAM" value={metrics.jsHeapSize !== null ? `${metrics.jsHeapSize}MB` : '—'} />
      <Stat label="RES" value={metrics.resolution} />
      <Stat label="NET" value={metrics.networkType ?? '—'} />
    </div>
  )
}

function Stat({ label, value, className = 'text-gray-300' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded px-2 py-1">
      <span className="text-gray-600">{label}</span>
      <span className={`font-bold ${className}`}>{value}</span>
    </div>
  )
}
