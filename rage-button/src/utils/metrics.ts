import type { Metrics } from '../types'

let fpsValue: number | null = null
let frameCount = 0
let lastTime = performance.now()

function trackFPS() {
  frameCount++
  const now = performance.now()
  if (now - lastTime >= 1000) {
    fpsValue = Math.round((frameCount * 1000) / (now - lastTime))
    frameCount = 0
    lastTime = now
  }
  requestAnimationFrame(trackFPS)
}

export function startFPSTracking() {
  requestAnimationFrame(trackFPS)
}

export async function collectMetrics(): Promise<Metrics> {
  const nav = navigator as Navigator & {
    connection?: { type?: string; downlink?: number; effectiveType?: string }
    deviceMemory?: number
  }

  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number }
  }).memory

  const resolution = `${window.screen.width}x${window.screen.height}`
  const browser = getBrowserInfo()
  const os = getOSInfo()

  let ping: number | null = null
  try {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
    const start = performance.now()
    await fetch(`${apiUrl}/health`, { method: 'GET', cache: 'no-store', mode: 'no-cors' })
    ping = Math.round(performance.now() - start)
  } catch {
    ping = null
  }

  return {
    fps: fpsValue,
    memory: nav.deviceMemory ?? null,
    resolution,
    browser,
    os,
    ping,
    networkType: nav.connection?.type ?? nav.connection?.effectiveType ?? null,
    networkDownlink: nav.connection?.downlink ?? null,
    jsHeapSize: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null,
    jsHeapLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : null,
  }
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ''}`
  if (ua.includes('Edg/')) return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ''}`
  if (ua.includes('Chrome/')) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ''}`
  if (ua.includes('Safari/')) return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ''}`
  return ua.slice(0, 60)
}

function getOSInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X')) return `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? ''}`
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ''}`
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}
