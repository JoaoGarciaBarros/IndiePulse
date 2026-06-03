import { useState, useRef, useEffect } from 'react'
import { useRageTrigger } from '../hooks/useRageTrigger'
import { useRageStore } from '../store/rageStore'
import { CategorySelector } from './CategorySelector'

const STATE_CONFIG = {
  idle: {
    text: 'RAGE',
    subtext: 'Reportar Problema',
    bg: 'bg-red-600 hover:bg-red-500',
    glow: 'shadow-red-900/60',
  },
  triggered: {
    text: '💢',
    subtext: 'Capturando...',
    bg: 'bg-red-700',
    glow: 'shadow-red-600/80',
  },
  loading: {
    text: '⟳',
    subtext: 'Enviando...',
    bg: 'bg-red-800',
    glow: 'shadow-red-900/60',
  },
  success: {
    text: '✓',
    subtext: 'Problema enviado com sucesso.',
    bg: 'bg-green-700 hover:bg-green-600',
    glow: 'shadow-green-900/60',
  },
  error: {
    text: '✕',
    subtext: 'Erro ao enviar. Tente novamente.',
    bg: 'bg-orange-700',
    glow: 'shadow-orange-900/60',
  },
}

export function RageButton() {
  const { trigger, state } = useRageTrigger()
  const { comment, setComment } = useRageStore()
  const [animClass, setAnimClass] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const config = STATE_CONFIG[state]
  const disabled = state === 'loading' || state === 'triggered' || state === 'success'

  useEffect(() => {
    if (state === 'triggered') {
      setAnimClass('rage-shake')
      setTimeout(() => setAnimClass(''), 500)
    }
    if (state === 'success') {
      setAnimClass('success-bounce')
      setTimeout(() => setAnimClass(''), 400)
    }
  }, [state])

  const handleClick = () => {
    if (disabled) return
    setAnimClass('rage-pulse')
    setTimeout(() => setAnimClass(''), 600)
    trigger()
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="w-full">
        <CategorySelector disabled={disabled} />
      </div>

      <div className="relative flex items-center justify-center">
        {state === 'idle' && (
          <span className="absolute inset-0 rounded-full opacity-30 glow-red bg-red-600 blur-xl scale-110 pointer-events-none" />
        )}

        <button
          ref={buttonRef}
          onClick={handleClick}
          disabled={disabled}
          className={`
            relative z-10 w-44 h-44 rounded-full font-black text-white
            border-4 border-red-400/30
            shadow-2xl ${config.glow}
            transition-all duration-300 ease-out
            ${config.bg} ${animClass}
            disabled:cursor-not-allowed
            focus:outline-none focus:ring-4 focus:ring-red-500/50
            select-none
          `}
          aria-label="Rage trigger — reportar problema"
        >
          <div className="flex flex-col items-center gap-1">
            <span
              className={`
                text-5xl leading-none
                ${state === 'loading' ? 'spin inline-block' : ''}
              `}
            >
              {config.text}
            </span>
            <span className="text-xs font-bold tracking-widest uppercase opacity-80 mt-1">
              {config.subtext.split('\n')[0]}
            </span>
          </div>
        </button>
      </div>

      {(state === 'success' || state === 'error') && (
        <p
          className={`text-sm font-semibold text-center success-bounce ${
            state === 'success' ? 'text-green-400' : 'text-orange-400'
          }`}
        >
          {config.subtext}
        </p>
      )}

      <div className="w-full">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 400))}
          disabled={disabled}
          placeholder="O que aconteceu? (opcional)"
          rows={3}
          className="
            w-full bg-gray-900 border border-gray-700 rounded-lg
            text-gray-200 placeholder-gray-600 text-sm p-3 resize-none
            focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50
            transition-colors duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        />
        <div className="text-right text-xs text-gray-600 mt-1">{comment.length}/400</div>
      </div>
    </div>
  )
}
