import { toJpeg } from 'html-to-image'

export async function captureScreenshot(): Promise<string | null> {
  try {
    const dataUrl = await toJpeg(document.body, {
      quality: 0.7,
      backgroundColor: '#030712',
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      // skip external resources that may block capture
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return !node.classList.contains('rage-skip-screenshot')
        }
        return true
      },
    })
    return dataUrl
  } catch (err) {
    console.warn('Screenshot capture failed:', err)
    return null
  }
}

export async function captureGameCanvas(): Promise<string | null> {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas')
  if (!canvas) return null
  try {
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    return null
  }
}
