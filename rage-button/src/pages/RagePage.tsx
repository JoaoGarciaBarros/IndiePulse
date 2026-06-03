import { RageButton } from '../components/RageButton'
import { MetricsBar } from '../components/MetricsBar'

export function RagePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-widest text-red-500 mb-2">
          💢 Rage Trigger
        </h1>
        <p className="text-gray-500 text-sm">
          Um clique. Problema reportado. Contexto completo capturado automaticamente.
        </p>
      </div>

      <RageButton />

      <div className="mt-4 w-full max-w-lg">
        <p className="text-xs text-gray-700 text-center mb-3 uppercase tracking-widest">Métricas ao vivo</p>
        <MetricsBar />
      </div>

      <div className="text-xs text-gray-800 text-center max-w-sm">
        Ao clicar, capturamos: screenshot, logs do console, métricas de performance,
        informações de sessão e contexto do navegador.
      </div>
    </div>
  )
}
