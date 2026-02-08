import { logger } from '@/views/utils/logger'
import { normalizeBase64 } from './wordParser.shared'

/** blob URL 数量警告阈值（超出时记录警告，但不主动释放，避免正在使用的图片变白块） */
const MAX_BLOB_URLS = 500

export class ImageStore {
  private blobUrls: string[] = []

  /** 已创建的 blob URL 数量 */
  get size(): number {
    return this.blobUrls.length
  }

  /** 释放所有 blob URL */
  clear(): void {
    if (this.blobUrls.length === 0) return
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url))
    this.blobUrls = []
  }

  /** 注册 blob URL（惰性清理：仅在 clear() 时统一释放，避免正在显示的图片被提前 revoke） */
  private registerBlobUrl(url: string): void {
    this.blobUrls.push(url)
    if (this.blobUrls.length === MAX_BLOB_URLS) {
      logger.warn(
        `[ImageStore] blob URL 数量达到 ${MAX_BLOB_URLS}，将在组件卸载时统一释放`
      )
    }
  }

  async replaceDataImagesWithBlobUrls(html: string): Promise<string> {
    try {
      // 使用正则直接在 HTML 字符串上操作（避免 DOMParser 对超长属性值的截断风险）
      const dataUrlRegex = /(<img\b[^>]*?)src=(["'])(data:(?:image\/[^;]+|application\/octet-stream);base64,([^"']*))\2([^>]*?>)/gi
      const matches: Array<{ full: string; before: string; quote: string; dataUrl: string; base64: string; after: string }> = []
      let match: RegExpExecArray | null

      while ((match = dataUrlRegex.exec(html)) !== null) {
        matches.push({
          full: match[0],
          before: match[1],
          quote: match[2],
          dataUrl: match[3],
          base64: match[4],
          after: match[5]
        })
      }

      if (matches.length === 0) return html

      // 并行转换所有图片
      const results = await Promise.all(
        matches.map(async (m) => {
          const blobUrl = await this.createBlobUrlFromDataUrl(m.dataUrl)
          return { ...m, blobUrl }
        })
      )

      // 从后往前替换（避免偏移问题）
      let result = html
      for (const r of results.reverse()) {
        if (r.blobUrl) {
          const replacement = `${r.before}src=${r.quote}${r.blobUrl}${r.quote} data-origin-src=${r.quote}${r.dataUrl}${r.quote}${r.after}`
          result = result.replace(r.full, replacement)
        }
      }

      return result
    } catch (e) {
      logger.warn('ImageStore: 替换 data 图片为 Blob URL 失败:', e)
      return html
    }
  }

  /**
   * 将 data URL 转为 blob URL
   * 策略：atob 手动解码为主（不经过 URL 解析器，无长度限制），fetch 为备选
   *   1. 去空白 → atob 解码 — 最可靠，保留原始数据完整性
   *   2. normalizeBase64 深度清洗 → atob — 处理非标准编码
   */
  private async createBlobUrlFromDataUrl(dataUrl: string): Promise<string | null> {
    try {
      const commaIdx = dataUrl.indexOf(',')
      if (commaIdx === -1) return null
      const meta = dataUrl.substring(0, commaIdx)
      const rawBase64 = dataUrl.substring(commaIdx + 1)
      const mimeMatch = meta.match(/data:([^;]+);base64/i)
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'

      // 最小清洗：仅去除空白字符（DOCX base64 最常见的问题）
      const cleanBase64 = rawBase64.replace(/[\s\r\n\t]+/g, '')
      if (!cleanBase64) return null

      // 策略 1（主路径）：atob 手动解码 — 不经过 URL 解析器，无长度限制
      const blobUrl = this.tryAtobDecode(cleanBase64, mimeType)
      if (blobUrl) return blobUrl

      // 策略 2：normalizeBase64 深度清洗后重试 atob
      const deepClean = normalizeBase64(rawBase64)
      if (deepClean && deepClean !== cleanBase64) {
        const blobUrl2 = this.tryAtobDecode(deepClean, mimeType)
        if (blobUrl2) return blobUrl2
      }

      logger.warn('[ImageStore] 所有解码策略失败')
      return null
    } catch (e) {
      logger.warn('[ImageStore] 生成 Blob URL 失败:', e)
      return null
    }
  }

  /** atob 解码 base64 为 Blob 并创建 blob URL */
  private tryAtobDecode(base64: string, mimeType: string): string | null {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        this.registerBlobUrl(url)
        return url
      }
      return null
    } catch {
      return null
    }
  }
}
