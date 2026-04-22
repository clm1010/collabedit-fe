/**
 * 文档转换服务 API
 * 封装与 collabedit-doc-converter 服务的通信
 * 新版：OOXML 直接解析，导入返回 Tiptap JSON，导出接收 Tiptap JSON
 */

/**
 * 通用 Tiptap 节点类型（宽松，便于跨版本兼容）
 * 命名一致性：后端对应类型为 ImportResponse (see collabedit-doc-converter/src/types/tiptapJson.ts)
 */
export interface TiptapNodeLoose {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNodeLoose[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export type HeaderFooterType = 'default' | 'first' | 'even'

/**
 * 页眉/页脚富内容：新格式为 Tiptap 节点数组，旧格式为 HTML 字符串（向后兼容）
 */
export type HeaderFooterMap = Partial<Record<HeaderFooterType, TiptapNodeLoose[] | string>>

export interface SectionDefinition {
  pageSetup?: {
    width?: number
    height?: number
    margins?: { top?: number; bottom?: number; left?: number; right?: number }
    orientation?: 'portrait' | 'landscape'
  }
  headerRefs?: { default?: string; first?: string; even?: string }
  footerRefs?: { default?: string; first?: string; even?: string }
  type?: string
  titlePg?: boolean
  headerFooter?: { header?: string; footer?: string }
}

export interface FootnoteData {
  id: number
  noteType: string
  content: TiptapNodeLoose[]
}

export interface DocMetadata {
  paperSize?: { width: number; height: number }
  margins?: { top: number; bottom: number; left: number; right: number }
  defaultFont?: string
  defaultFontSize?: number
  headers?: HeaderFooterMap
  footers?: HeaderFooterMap
  sections?: SectionDefinition[]
  hasFootnotes?: boolean
  hasEndnotes?: boolean
  hasComments?: boolean
  numberingDefinitions?: object[]
  customStyles?: object[]
  isRedHead?: boolean
}

export interface TiptapDoc {
  type: 'doc'
  content: Array<Record<string, unknown>>
}

export interface ImportResult {
  data: { content: TiptapDoc }
  metadata: DocMetadata
  logs: { info: string[]; warn: string[]; error: string[] }
  footnotes?: FootnoteData[]
  endnotes?: FootnoteData[]
}

export interface ConverterHealthStatus {
  available: boolean
  /** @deprecated 历史字段，恒为 false；保留以兼容旧缓存 */
  unoserver: boolean
  /** Puppeteer 模式下的 Chromium 连通状态；lazy launch 策略下首次未请求时可能是 false */
  chromium?: boolean
}

const CONVERTER_BASE = import.meta.env.VITE_CONVERTER_URL || '/converter'

let _healthCache: { result: ConverterHealthStatus; ts: number } | null = null
const HEALTH_CACHE_TTL = 30_000

export async function checkConverterHealth(): Promise<ConverterHealthStatus> {
  if (_healthCache && Date.now() - _healthCache.ts < HEALTH_CACHE_TTL) {
    return _healthCache.result
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${CONVERTER_BASE}/health`, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      const result: ConverterHealthStatus = { available: false, unoserver: false, chromium: false }
      _healthCache = { result, ts: Date.now() }
      return result
    }

    const data = await res.json()
    const result: ConverterHealthStatus = {
      available: data.status === 'ok' || data.status === 'degraded',
      unoserver: data.unoserver === true,
      chromium: data.chromium === true,
    }
    _healthCache = { result, ts: Date.now() }
    return result
  } catch {
    const result: ConverterHealthStatus = { available: false, unoserver: false, chromium: false }
    _healthCache = { result, ts: Date.now() }
    return result
  }
}

export function invalidateHealthCache() {
  _healthCache = null
}

export async function importDocx(file: File | ArrayBuffer): Promise<ImportResult> {
  const formData = new FormData()
  if (file instanceof File) {
    formData.append('file', file)
  } else {
    formData.append('file', new Blob([file]), 'document.docx')
  }

  const res = await fetch(`${CONVERTER_BASE}/import`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Import failed (${res.status}): ${errText}`)
  }

  return res.json()
}

/**
 * 选择性保存高保真方案：导出接口升级为 multipart/form-data
 *
 * 字段：
 * - content      : JSON 字符串（Tiptap Doc）
 * - metadata     : JSON 字符串（Partial<DocMetadata>），可选
 * - originalDocx : 原始 DOCX File/ArrayBuffer，可选。
 *     提供时走"字节原样复制 + 仅 patch 改动节点"的高保真路径；
 *     未提供时 converter 自动降级为 legacy 全量重序列化。
 *
 * 兼容性：后端同一端点同时支持 JSON 请求（legacy）和 multipart/form-data 请求，
 * 升级期间若只改前端部分页面也不会破坏 legacy。
 */
export interface ExportDocxOptions {
  /** 原始 DOCX 字节，若省略则自动降级为 legacy 路径 */
  originalDocx?: ArrayBuffer | Blob | File | null
  /** 强制指定导出模式，默认由 converter 根据 originalDocx 存在性决定 */
  mode?: 'selective' | 'legacy'
  /** 原始 DOCX 附带的文件名，用于回写到响应头 Content-Disposition 做兜底 */
  originalFileName?: string
}

export async function exportDocx(
  content: TiptapDoc,
  metadata?: Partial<DocMetadata>,
  options?: ExportDocxOptions
): Promise<Blob> {
  const formData = new FormData()
  formData.append('content', JSON.stringify(content))
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  if (options?.originalDocx) {
    const blob =
      options.originalDocx instanceof Blob
        ? options.originalDocx
        : new Blob([options.originalDocx], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          })
    const name = options.originalFileName || 'original.docx'
    formData.append('originalDocx', blob, name)
  }

  const headers: Record<string, string> = {}
  if (options?.mode) {
    headers['X-Export-Mode'] = options.mode
  }

  const res = await fetch(`${CONVERTER_BASE}/export/docx`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Export DOCX failed (${res.status}): ${errText}`)
  }

  return res.blob()
}

/**
 * Puppeteer PDF 导出配置（与后端 pdfExporter.ts 的 PdfOptions 结构保持一致）
 *
 * 注意：margin 值为字符串且支持单位（'20mm' / '1in' / '96px' / '2cm'）。
 */
export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
  margin?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  landscape?: boolean
  /** 默认 true，保证公文红头、表格底纹、彩色边框被渲染到 PDF */
  printBackground?: boolean
}

/**
 * 导出 PDF（Puppeteer 模式）
 *
 * 请求体：{ html: string, options?: PdfOptions }
 *
 * 约定：调用方必须把 HTML 中所有图片内联为 data URL（见
 * `views/utils/fileUtils.ts#inlineAllImagesAsync`），否则后端容器可能无法访问外链。
 */
export async function exportPdf(
  html: string,
  options?: PdfOptions
): Promise<Blob> {
  const res = await fetch(`${CONVERTER_BASE}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, options }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Export PDF failed (${res.status}): ${errText}`)
  }

  return res.blob()
}
