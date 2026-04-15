/**
 * 导出时将 CSS 裁剪（data-crop-*）"烧入"为实际裁剪后的图片 data URL，
 * 使导出的 HTML / DOCX 中图片已是裁剪后的最终结果，不依赖 CSS 渲染。
 */

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`))
    img.src = src
  })

const guessMimeType = (src: string): string => {
  if (src.startsWith('data:image/png')) return 'image/png'
  if (src.startsWith('data:image/gif')) return 'image/gif'
  if (src.startsWith('data:image/webp')) return 'image/webp'
  return 'image/png'
}

/**
 * 将带有 data-crop-* 属性的 <img> 标签替换为裁剪后的图片。
 * 处理后的 HTML 不再包含任何 data-crop-* 属性。
 */
export async function applyCropToImages(html: string): Promise<string> {
  if (!html || !html.includes('data-crop-')) return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const container = doc.body.firstElementChild as HTMLElement
  if (!container) return html

  const imgs = container.querySelectorAll(
    'img[data-crop-top], img[data-crop-right], img[data-crop-bottom], img[data-crop-left]'
  )
  if (imgs.length === 0) return html

  for (const img of Array.from(imgs)) {
    const ct = parseFloat(img.getAttribute('data-crop-top') || '0')
    const cr = parseFloat(img.getAttribute('data-crop-right') || '0')
    const cb = parseFloat(img.getAttribute('data-crop-bottom') || '0')
    const cl = parseFloat(img.getAttribute('data-crop-left') || '0')

    if (ct <= 0 && cr <= 0 && cb <= 0 && cl <= 0) {
      img.removeAttribute('data-crop-top')
      img.removeAttribute('data-crop-right')
      img.removeAttribute('data-crop-bottom')
      img.removeAttribute('data-crop-left')
      continue
    }

    const src = img.getAttribute('src') || ''
    if (!src) continue

    try {
      const image = await loadImage(src)
      const natW = image.naturalWidth
      const natH = image.naturalHeight
      if (!natW || !natH) continue

      const sx = Math.round(cl * natW)
      const sy = Math.round(ct * natH)
      const sw = Math.round((1 - cl - cr) * natW)
      const sh = Math.round((1 - ct - cb) * natH)
      if (sw <= 0 || sh <= 0) continue

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
      const mime = guessMimeType(src)
      const croppedDataUrl = canvas.toDataURL(mime)

      img.setAttribute('src', croppedDataUrl)

      const displayW = parseFloat(img.getAttribute('width') || '0')
      const displayH = parseFloat(img.getAttribute('height') || '0')
      if (!displayW && !displayH) {
        img.setAttribute('width', String(sw))
        img.setAttribute('height', String(sh))
      }

      img.removeAttribute('data-crop-top')
      img.removeAttribute('data-crop-right')
      img.removeAttribute('data-crop-bottom')
      img.removeAttribute('data-crop-left')
    } catch {
      img.removeAttribute('data-crop-top')
      img.removeAttribute('data-crop-right')
      img.removeAttribute('data-crop-bottom')
      img.removeAttribute('data-crop-left')
    }
  }

  return container.innerHTML
}
