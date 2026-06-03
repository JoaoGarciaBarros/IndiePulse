import type { LogEntry } from '../types'

interface TimelineEvent {
  time: number
  type: 'log' | 'warn' | 'error' | 'rage' | 'fps_drop'
  label: string
}

function buildTimeline(logs: LogEntry[], rageTimestamp: string): TimelineEvent[] {
  const rageTime = new Date(rageTimestamp).getTime()
  const baseTime = Math.min(rageTime, ...logs.map((l) => l.timestamp)) - 1000

  const events: TimelineEvent[] = logs.map((l) => ({
    time: l.timestamp - baseTime,
    type: l.level,
    label: l.message.slice(0, 80),
  }))

  events.push({
    time: rageTime - baseTime,
    type: 'rage',
    label: '🔴 Rage Trigger',
  })

  return events.sort((a, b) => a.time - b.time)
}

const TYPE_STYLE: Record<string, string> = {
  log: 'text-gray-400 border-gray-700',
  warn: 'text-yellow-400 border-yellow-700',
  error: 'text-red-400 border-red-700',
  rage: 'text-red-300 border-red-500 font-bold',
  fps_drop: 'text-orange-400 border-orange-700',
}

export function Timeline({ logs, rageTimestamp }: { logs: LogEntry[]; rageTimestamp: string }) {
  const events = buildTimeline(logs, rageTimestamp)

  return (
    <div className="relative pl-4 border-l border-gray-800 space-y-3">
      {events.map((evt, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-800 border border-gray-600" />
          <div className={`text-xs border-l-2 pl-3 py-1 ${TYPE_STYLE[evt.type] ?? TYPE_STYLE.log}`}>
            <span className="text-gray-600 mr-2">{formatMs(evt.time)}</span>
            {evt.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
