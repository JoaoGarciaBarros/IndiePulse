import type { RageCategory } from '../types'
import { useRageStore } from '../store/rageStore'

const CATEGORIES: { value: RageCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'lag', label: 'Lag', icon: '⚡' },
  { value: 'frustration', label: 'Frustração', icon: '😤' },
  { value: 'exploit', label: 'Exploit', icon: '🔓' },
  { value: 'ui_ux', label: 'UI/UX', icon: '🎨' },
  { value: 'performance', label: 'Performance', icon: '📊' },
  { value: 'other', label: 'Outro', icon: '❓' },
]

export function CategorySelector({ disabled }: { disabled?: boolean }) {
  const { category, setCategory } = useRageStore()

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => setCategory(cat.value)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border transition-all duration-200
            ${category === cat.value
              ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-red-700 hover:text-gray-200'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  )
}
