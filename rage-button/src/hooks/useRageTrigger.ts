import { useCallback } from 'react'
import { useRageStore } from '../store/rageStore'
import { api } from '../services/api'
import { logger } from '../utils/logger'
import { collectMetrics } from '../utils/metrics'
import { captureScreenshot } from '../utils/screenshot'
import { getSessionId, getUserId } from '../utils/session'
import type { RagePayload } from '../types'

export function useRageTrigger() {
  const store = useRageStore()

  const trigger = useCallback(async () => {
    if (store.isOnCooldown() || store.state === 'loading') return

    store.setState('triggered')

    await new Promise((r) => setTimeout(r, 400))

    store.setState('loading')

    try {
      const [metrics, screenshot, logs] = await Promise.all([
        collectMetrics(),
        captureScreenshot(),
        Promise.resolve(logger.getLogs()),
      ])

      const payload: RagePayload = {
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        userId: getUserId(),
        category: store.category,
        comment: store.comment,
        logs,
        metrics,
        screenshot,
        page: window.location.pathname,
        metadata: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      }

      const res = await api.submitRage(payload)
      store.setLastIncidentId(res.data.id)
      store.setState('success')
      store.startCooldown(15000)

      setTimeout(() => {
        store.setState('idle')
        store.setComment('')
      }, 4000)
    } catch (err) {
      console.error('Rage trigger failed:', err)
      store.setState('error')
      setTimeout(() => store.setState('idle'), 3000)
    }
  }, [store])

  return { trigger, state: store.state, isOnCooldown: store.isOnCooldown() }
}
