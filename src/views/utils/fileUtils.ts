/**
 * 文件处理工具函数
 */

import { logger } from './logger'

// ============================================================
// doc-stream 调试工具（仅开发环境生效，生产环境为空操作）
// ============================================================

const DOC_STREAM_DEBUG_KEY = 'docStreamDebug'

export const isDocStreamDebugEnabled = (): boolean => {
  if (!import.meta.env.DEV) return false
  try {
    if (typeof window !== 'undefined' && (window as any).__DOC_STREAM_DEBUG__ === true) return true
    return localStorage.getItem(DOC_STREAM_DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

export const logDocStreamDebug = (...args: unknown[]): void => {
  if (!import.meta.env.DEV) return
  if (!isDocStreamDebugEnabled()) return
  logger.info('[doc-stream]', ...args)
}

type DocStreamSnapshot = {
  ts: string
  docId?: string | number
  stage: string
  payload: Record<string, unknown>
}

const getDocStreamReportStore = (): DocStreamSnapshot[] => {
  if (!import.meta.env.DEV) return []
  if (typeof window === 'undefined') return []
  const globalAny = window as any
  if (!globalAny.__DOC_STREAM_REPORT__) {
    globalAny.__DOC_STREAM_REPORT__ = [] as DocStreamSnapshot[]
  }
  return globalAny.__DOC_STREAM_REPORT__
}

export const addDocStreamSnapshot = (
  stage: string,
  payload: Record<string, unknown>,
  docId?: string | number
): void => {
  if (!import.meta.env.DEV) return
  if (!isDocStreamDebugEnabled()) return
  const store = getDocStreamReportStore()
  store.push({
    ts: new Date().toISOString(),
    docId,
    stage,
    payload
  })
  if (store.length > 200) {
    store.splice(0, store.length - 200)
  }
}

export const exportDocStreamReport = (docId?: string | number): void => {
  if (!import.meta.env.DEV) return
  const store = getDocStreamReportStore()
  const filtered = docId ? store.filter((item) => String(item.docId) === String(docId)) : store
  const payload = {
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    docId: docId ?? null,
    items: filtered
  }
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doc-stream-report-${docId ?? 'all'}-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    logger.error('[doc-stream] export report failed:', error)
  }
}

type DocStreamCompareResult = {
  docId: string | number | null
  matched: boolean
  issues: string[]
  summary: Record<string, unknown>
}

export const compareDocStreamReport = (docId?: string | number): DocStreamCompareResult => {
  const emptyResult: DocStreamCompareResult = {
    docId: docId ?? null, matched: true, issues: [], summary: {}
  }
  if (!import.meta.env.DEV) return emptyResult
  const store = getDocStreamReportStore()
  const filtered = docId ? store.filter((item) => String(item.docId) === String(docId)) : store
  const latest = (stage: string) =>
    [...filtered].reverse().find((item) => item.stage === stage)?.payload || {}

  const blobSha = String(
    latest('performance_blob_sha256').sha256 || latest('template_blob_sha256').sha256 || ''
  )
  const parserSha = String(
    latest('parser_decoded_bytes').sha256 ||
      latest('parser_decoded_bytes_raw').sha256 ||
      latest('editor_cached_bytes').sha256 ||
      ''
  )

  const blobSize =
    Number(
      latest('performance_blob_received').size || latest('template_blob_received').size || 0
    ) || 0
  const parserLength =
    Number(
      latest('parser_decoded_bytes').length ||
        latest('parser_decoded_bytes_raw').length ||
        latest('editor_cached_bytes').length ||
        0
    ) || 0

  const issues: string[] = []
  if (!blobSha || blobSha === 'unavailable') issues.push('缺少前端 blob sha256')
  if (!parserSha || parserSha === 'unavailable') issues.push('缺少解析后字节 sha256')
  if (blobSha && parserSha && blobSha !== parserSha)
    issues.push('前端 blob sha256 与解析后字节 sha256 不一致')
  if (blobSize && parserLength && blobSize !== parserLength) {
    issues.push('前端 blob size 与解析后字节长度不一致')
  }

  return {
    docId: docId ?? null,
    matched: issues.length === 0,
    issues,
    summary: {
      blobSha256: blobSha || 'unavailable',
      parserSha256: parserSha || 'unavailable',
      blobSize: blobSize || 'unavailable',
      parserLength: parserLength || 'unavailable'
    }
  }
}

export const printDocStreamCompareResult = (docId?: string | number): void => {
  if (!import.meta.env.DEV) return
  const result = compareDocStreamReport(docId)
  if (result.matched) {
    logger.info('[doc-stream] compare: MATCH', result.summary)
  } else {
    logger.warn('[doc-stream] compare: MISMATCH', result.issues, result.summary)
  }
}

type DataImageStat = {
  mime: string
  length: number
}

export const collectDataImageStats = (html: string): DataImageStat[] => {
  if (!html) return []
  const regex = /data:image\/([^;]+);base64,([A-Za-z0-9+/=\s]+)/gi
  const stats: DataImageStat[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(html))) {
    const mime = match[1] || 'unknown'
    const base64 = (match[2] || '').replace(/[\s\r\n]+/g, '')
    stats.push({ mime, length: base64.length })
  }
  return stats
}

export const summarizeDataImageStats = (stats: DataImageStat[]) => {
  const count = stats.length
  if (!count) {
    return { count: 0, min: 0, max: 0, avg: 0, byMime: {} as Record<string, number> }
  }
  let min = Number.MAX_SAFE_INTEGER
  let max = 0
  let total = 0
  const byMime: Record<string, number> = {}
  stats.forEach((item) => {
    total += item.length
    min = Math.min(min, item.length)
    max = Math.max(max, item.length)
    byMime[item.mime] = (byMime[item.mime] || 0) + 1
  })
  return { count, min, max, avg: Math.round(total / count), byMime }
}

type DataImageAnomaly = {
  index: number
  mime: string
  length: number
  approxBytes: number
  reasons: string[]
}

export const collectDataImageAnomalies = (
  html: string,
  options?: { minLength?: number }
): DataImageAnomaly[] => {
  if (!html) return []
  const minLength = options?.minLength ?? 5000
  const regex = /data:image\/([^;]+);base64,([A-Za-z0-9+/=\s]+)/gi
  const anomalies: DataImageAnomaly[] = []
  let match: RegExpExecArray | null
  let index = 0
  while ((match = regex.exec(html))) {
    index += 1
    const mime = match[1] || 'unknown'
    const base64 = (match[2] || '').replace(/[\s\r\n]+/g, '')
    const length = base64.length
    const approxBytes = Math.floor((length * 3) / 4)
    const mod = length % 4
    const hasPadding = /={1,2}$/.test(base64)
    const needsPadding = mod !== 0
    const reasons: string[] = []
    if (needsPadding && !hasPadding) reasons.push('missing_padding')
    if (length < minLength) reasons.push('too_short')
    if (reasons.length) {
      anomalies.push({ index, mime, length, approxBytes, reasons })
    }
  }
  return anomalies
}

export const exportSuspectImagesReport = (docId?: string | number): void => {
  if (!import.meta.env.DEV) return
  const store = getDocStreamReportStore()
  const filtered = docId ? store.filter((item) => String(item.docId) === String(docId)) : store
  const latest = [...filtered]
    .reverse()
    .find((item) => item.stage === 'editor_parsed_image_anomalies')
  const payload = {
    exportedAt: new Date().toISOString(),
    docId: docId ?? null,
    anomalies: latest?.payload?.anomalies || []
  }
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doc-image-anomalies-${docId ?? 'all'}-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    logger.error('[doc-stream] export image anomalies failed:', error)
  }
}

export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/i)
  if (!match) return null
  const mime = match[1]
  const base64 = match[2].replace(/[\s\r\n]+/g, '')
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

export const restoreBlobImagesFromOrigin = (html: string): string => {
  if (!html) return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="export-root">${html}</div>`, 'text/html')
    const root = doc.getElementById('export-root')
    if (!root) return html
    const images = Array.from(root.querySelectorAll('img'))
    images.forEach((img) => {
      const src = img.getAttribute('src') || ''
      if (!src.startsWith('blob:')) return
      const origin = img.getAttribute('data-origin-src') || ''
      if (origin.startsWith('data:image/')) {
        img.setAttribute('src', origin)
      }
    })
    return root.innerHTML
  } catch {
    return html
  }
}

/**
 * 异步版本：将所有 blob URL 图片转为 data URL（含无 data-origin-src 的情况）
 * 用于保存前确保所有图片数据内联到 HTML 中
 */
export const restoreBlobImagesFromOriginAsync = async (html: string): Promise<string> => {
  if (!html) return html
  if (!html.includes('blob:')) return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="export-root">${html}</div>`, 'text/html')
    const root = doc.getElementById('export-root')
    if (!root) return html
    const images = Array.from(root.querySelectorAll('img'))

    // 统计计数
    let blobCount = 0
    let restoredByOrigin = 0
    let restoredByFetch = 0
    let failedCount = 0

    for (const img of images) {
      const src = img.getAttribute('src') || ''
      if (!src.startsWith('blob:')) continue
      blobCount++
      // 优先使用 data-origin-src
      const origin = img.getAttribute('data-origin-src') || ''
      if (origin.startsWith('data:image/')) {
        img.setAttribute('src', origin)
        restoredByOrigin++
        continue
      }
      // 没有 data-origin-src 时，通过 fetch 获取 blob 数据并转为 data URL
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        if (blob.size === 0) {
          logger.warn('[restoreBlob] blob 为空，跳过:', src.substring(0, 60))
          failedCount++
          continue
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        if (dataUrl && dataUrl.startsWith('data:')) {
          img.setAttribute('src', dataUrl)
          restoredByFetch++
          logger.info('[restoreBlob] blob→data URL 成功:', blob.type, blob.size, 'bytes')
        } else {
          failedCount++
        }
      } catch (e) {
        failedCount++
        logger.warn('[restoreBlob] fetch blob 失败:', src.substring(0, 60), e)
      }
    }

    // 汇总日志
    if (blobCount > 0) {
      logger.info(
        `[restoreBlob] 处理完成: 共 ${blobCount} 张 blob 图片, ` +
          `data-origin-src 恢复 ${restoredByOrigin} 张, fetch 恢复 ${restoredByFetch} 张, 失败 ${failedCount} 张`
      )
    }

    return root.innerHTML
  } catch {
    return html
  }
}

const bufferToHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

const sha256HexFallback = (data: Uint8Array): string => {
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n))
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z)
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z)
  const sigma0 = (x: number) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x)
  const sigma1 = (x: number) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x)
  const gamma0 = (x: number) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3)
  const gamma1 = (x: number) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10)

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ])

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ])

  const length = data.length
  const bitLenHi = Math.floor((length * 8) / 0x100000000)
  const bitLenLo = (length * 8) >>> 0

  const withOne = length + 1
  const padLen = (withOne % 64 <= 56 ? 56 : 120) - (withOne % 64)
  const totalLen = withOne + padLen + 8
  const buffer = new Uint8Array(totalLen)
  buffer.set(data)
  buffer[length] = 0x80
  buffer[totalLen - 8] = (bitLenHi >>> 24) & 0xff
  buffer[totalLen - 7] = (bitLenHi >>> 16) & 0xff
  buffer[totalLen - 6] = (bitLenHi >>> 8) & 0xff
  buffer[totalLen - 5] = bitLenHi & 0xff
  buffer[totalLen - 4] = (bitLenLo >>> 24) & 0xff
  buffer[totalLen - 3] = (bitLenLo >>> 16) & 0xff
  buffer[totalLen - 2] = (bitLenLo >>> 8) & 0xff
  buffer[totalLen - 1] = bitLenLo & 0xff

  const w = new Uint32Array(64)
  for (let i = 0; i < buffer.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      const idx = i + j * 4
      w[j] =
        (buffer[idx] << 24) | (buffer[idx + 1] << 16) | (buffer[idx + 2] << 8) | buffer[idx + 3]
    }
    for (let j = 16; j < 64; j++) {
      w[j] = (gamma1(w[j - 2]) + w[j - 7] + gamma0(w[j - 15]) + w[j - 16]) >>> 0
    }

    let a = h[0]
    let b = h[1]
    let c = h[2]
    let d = h[3]
    let e = h[4]
    let f = h[5]
    let g = h[6]
    let hh = h[7]

    for (let j = 0; j < 64; j++) {
      const t1 = (hh + sigma1(e) + ch(e, f, g) + k[j] + w[j]) >>> 0
      const t2 = (sigma0(a) + maj(a, b, c)) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }

  let out = ''
  for (let i = 0; i < h.length; i++) {
    out += h[i].toString(16).padStart(8, '0')
  }
  return out
}

export const computeSha256HexFromArrayBuffer = async (data: ArrayBuffer): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', data)
      return bufferToHex(digest)
    }
    return sha256HexFallback(new Uint8Array(data))
  } catch {
    return sha256HexFallback(new Uint8Array(data))
  }
}

export const computeSha256HexFromBlob = async (blob: Blob): Promise<string> => {
  try {
    const buffer = await blob.arrayBuffer()
    return await computeSha256HexFromArrayBuffer(buffer)
  } catch {
    return ''
  }
}

/**
 * 将 Blob 转换为 Base64 字符串
 * @param blob Blob 对象
 * @returns Promise<string> Base64 字符串（data URL 格式）
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 Base64 字符串转换为 Blob
 * @param base64 Base64 字符串（data URL 格式）
 * @param mimeType MIME 类型（可选，如果不提供则从 data URL 中提取）
 * @returns Blob 对象
 */
export const base64ToBlob = (base64: string, mimeType?: string): Blob => {
  // 从 data URL 提取 MIME 类型和数据
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 data URL format')
  }

  const type = mimeType || matches[1]
  const data = matches[2]

  // 解码 base64
  const binaryString = atob(data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new Blob([bytes], { type })
}

/**
 * 将 Base64 字符串解码为文本
 * @param base64 Base64 字符串（data URL 格式）
 * @returns Promise<string> 解码后的文本内容
 */
export const base64ToText = async (base64: string): Promise<string> => {
  try {
    // 从 data URL 提取 base64 数据
    const base64Data = base64.split(',')[1]
    if (!base64Data) {
      logger.warn('无效的 base64 数据格式')
      return ''
    }

    // 解码 base64 为二进制
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 使用 TextDecoder 解码为 UTF-8 文本
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch (error) {
    logger.error('Base64 解码失败:', error)
    return ''
  }
}

/**
 * 下载 Blob 文件
 * @param blob Blob 对象
 * @param filename 文件名
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 读取文件为 ArrayBuffer
 * @param file File 对象
 * @returns Promise<ArrayBuffer>
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 读取文件为文本
 * @param file File 对象
 * @param encoding 编码格式，默认 UTF-8
 * @returns Promise<string>
 */
export const readFileAsText = (file: File, encoding = 'utf-8'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsText(file, encoding)
  })
}

/**
 * 将 Blob 转换为文本（防止中文乱码）
 * 使用 ArrayBuffer + TextDecoder 确保正确解码 UTF-8 编码
 * @param blob Blob 对象
 * @param encoding 编码格式，默认 UTF-8
 * @returns Promise<string> 解码后的文本内容
 */
export const blobToText = async (blob: Blob, encoding = 'utf-8'): Promise<string> => {
  try {
    // 方式1：使用 arrayBuffer + TextDecoder（更可靠，防止乱码）
    const arrayBuffer = await blob.arrayBuffer()
    const decoder = new TextDecoder(encoding)
    return decoder.decode(arrayBuffer)
  } catch (error) {
    logger.error('Blob 转文本失败:', error)
    // 降级方案：使用 FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (err) => reject(err)
      reader.readAsText(blob, encoding)
    })
  }
}
