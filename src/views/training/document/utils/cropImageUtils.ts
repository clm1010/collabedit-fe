/**
 * 导出时将 CSS 裁剪（data-crop-* / cropTop/Right/Bottom/Left）"烧入" 为实际裁剪后的
 * 图片 data URL，使导出的 HTML / DOCX / PDF 中图片已是裁剪后的最终结果，
 * 不再依赖前端 CSS 渲染或后端 converter 处理 crop。
 *
 * 两个入口：
 *   - applyCropToImages(html)           —— 处理 HTML 字符串（用于 PDF / HTML 导出）
 *   - applyCropToTiptapImages(doc)      —— 处理 Tiptap JSON（用于 DOCX 导出，
 *                                           因为后端 /export/docx 接收的是 Tiptap JSON）
 */

import type { TiptapDoc, TiptapNodeLoose } from '@/api/converter'

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

/* ---------------------------------------------------------------------------
 * Tiptap JSON 版：用于 DOCX 导出（exportDocx(content, ...) 的 content）
 * ------------------------------------------------------------------------- */

const cropOneNode = async (node: TiptapNodeLoose): Promise<void> => {
  const attrs = node.attrs
  if (!attrs) return

  const ct = Number(attrs.cropTop) || 0
  const cr = Number(attrs.cropRight) || 0
  const cb = Number(attrs.cropBottom) || 0
  const cl = Number(attrs.cropLeft) || 0

  if (ct <= 0 && cr <= 0 && cb <= 0 && cl <= 0) {
    delete attrs.cropTop
    delete attrs.cropRight
    delete attrs.cropBottom
    delete attrs.cropLeft
    return
  }

  const src = String(attrs.src || '')
  if (!src) return

  try {
    const image = await loadImage(src)
    const natW = image.naturalWidth
    const natH = image.naturalHeight
    if (!natW || !natH) return

    const sx = Math.round(cl * natW)
    const sy = Math.round(ct * natH)
    const sw = Math.round((1 - cl - cr) * natW)
    const sh = Math.round((1 - ct - cb) * natH)
    if (sw <= 0 || sh <= 0) return

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
    const mime = guessMimeType(src)
    attrs.src = canvas.toDataURL(mime)

    if (!attrs.width && !attrs.height) {
      attrs.width = sw
      attrs.height = sh
    }
  } finally {
    delete attrs.cropTop
    delete attrs.cropRight
    delete attrs.cropBottom
    delete attrs.cropLeft
  }
}

const walkAndCrop = async (node: TiptapNodeLoose): Promise<void> => {
  if (node.type === 'image' && node.attrs) {
    await cropOneNode(node)
  }
  if (node.content && node.content.length > 0) {
    for (const child of node.content) {
      await walkAndCrop(child as TiptapNodeLoose)
    }
  }
}

/**
 * 深拷贝 Tiptap JSON 文档，对所有 image 节点 attrs 里带 crop 的做 Canvas 烧入，
 * 并剥除 cropTop/Right/Bottom/Left 属性。原 doc 不会被改动。
 *
 * 调用场景：
 *   const json = editor.getJSON()
 *   const cropped = await applyCropToTiptapImages(json as TiptapDoc)
 *   await exportDocx(cropped, metadata, options)
 */
export async function applyCropToTiptapImages(doc: TiptapDoc): Promise<TiptapDoc> {
  if (!doc || !doc.content || doc.content.length === 0) return doc
  const cloned = JSON.parse(JSON.stringify(doc)) as TiptapDoc
  for (const node of cloned.content) {
    await walkAndCrop(node as unknown as TiptapNodeLoose)
  }
  return cloned
}
