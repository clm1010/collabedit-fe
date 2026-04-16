import { logger } from '@/views/utils/logger'

export const hasStyleHintsInHtml = (html: string): boolean => {
  if (!html) return false
  return /font-family:|font-size:|color:|background-color:|text-align:|data-text-align|<h[1-6][\s>]|<mark[\s>]/i.test(
    html
  )
}

export const validateAndFixImages = (html: string): string => {
  const emptyImagePlaceholder =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+Qq7/7QAAAABJRU5ErkJggg=='
  const detectImageType = (base64Data: string): string | undefined => {
    const head = base64Data.replace(/[\s\r\n]/g, '').slice(0, 16)
    if (head.startsWith('iVBOR')) return 'png'
    if (head.startsWith('/9j/')) return 'jpeg'
    if (head.startsWith('R0lGOD')) return 'gif'
    if (head.startsWith('Qk')) return 'bmp'
    return undefined
  }

  html = html.replace(
    /<img([^>]*)src=(["'])data:application\/octet-stream;base64,([^"']*)\2([^>]*)>/gi,
    (_match, before, quote, base64Data, after) => {
      const type = detectImageType(base64Data)
      if (!type) {
        return `<img${before}src=${quote}data:image/png;base64,${emptyImagePlaceholder}${quote} data-image-invalid="unknown-type"${after}>`
      }
      if (base64Data.length > 10 * 1024 * 1024) {
        return `<img${before}src=${quote}data:image/png;base64,${emptyImagePlaceholder}${quote} data-image-invalid="oversized" data-original-size="${base64Data.length}"${after}>`
      }
      return `<img${before}src=${quote}data:image/${type};base64,${base64Data}${quote}${after}>`
    }
  )

  return html
}

export const sanitizeImagesIfNeeded = (html: string, source: string): string => {
  if (!html) return html
  if (!/<img\b/i.test(html) && !/data:image\//i.test(html)) return html
  const sanitized = validateAndFixImages(html)
  if (sanitized !== html) {
    const count = (html.match(/data:image\//gi) || []).length
    logger.info(
      `[sanitizeImages] 修复 data:image: source=${source}, count=${count}, before=${html.length}, after=${sanitized.length}`
    )
  }
  return sanitized
}
