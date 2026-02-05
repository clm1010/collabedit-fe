import { normalizeBase64, normalizeDataImageUrl } from './wordParser.shared'

export class ImageStore {
  private blobUrls: string[] = []

  clear(): void {
    if (this.blobUrls.length === 0) return
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url))
    this.blobUrls = []
  }

  async replaceDataImagesWithBlobUrls(html: string): Promise<string> {
    try {
      this.clear()
      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div id="image-store-root">${html}</div>`, 'text/html')
      const root = doc.getElementById('image-store-root')
      if (!root) return html
      const images = Array.from(root.querySelectorAll('img'))
      for (const img of images) {
        const src = img.getAttribute('src') || ''
        if (src.startsWith('data:image/')) {
          img.setAttribute('data-origin-src', src)
          const blobUrl = await this.createBlobUrlFromDataUrl(src)
          if (blobUrl) {
            img.setAttribute('src', blobUrl)
          } else {
            img.setAttribute('data-image-invalid', 'true')
          }
        }
      }
      return root.innerHTML
    } catch (e) {
      console.warn('ImageStore: 替换 data 图片为 Blob URL 失败:', e)
      return html
    }
  }

  private async createBlobUrlFromDataUrl(dataUrl: string): Promise<string | null> {
    try {
      const normalized = normalizeDataImageUrl(dataUrl)
      if (!normalized) {
        console.warn('[image] normalize failed for data url')
        return null
      }
      try {
        const response = await fetch(normalized.normalized)
        const blob = await response.blob()
        if (blob.size === 0) {
          throw new Error('empty blob')
        }
        console.info('[image] blob created (normalized)', {
          mime: blob.type,
          size: blob.size
        })
        const url = URL.createObjectURL(blob)
        this.blobUrls.push(url)
        return url
      } catch (normalizedFetchError) {
        // fallback to manual decode
        console.warn('[image] blob via fetch failed, fallback to atob', normalizedFetchError)
        const parts = normalized.normalized.split(',', 2)
        if (parts.length < 2) return null
        const meta = parts[0]
        const rawBase64 = parts[1]
        const mimeMatch = meta.match(/data:([^;]+);base64/i)
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
        const base64 = normalizeBase64(rawBase64)
        if (!base64) return null
        let binary = ''
        try {
          binary = atob(base64)
        } catch (decodeError) {
          console.warn('ImageStore: base64 解码失败:', decodeError)
          return null
        }
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: mimeType })
        const url = URL.createObjectURL(blob)
        this.blobUrls.push(url)
        return url
      }
    } catch (e) {
      console.warn('ImageStore: 生成 Blob URL 失败:', e)
      return null
    }
  }
}
