/**
 * 文档转换服务 API
 * 封装与 collabedit-doc-converter 服务的通信
 */

export interface DocMetadata {
  paperSize?: { width: number; height: number }
  margins?: { top: number; bottom: number; left: number; right: number }
  defaultFont?: string
  defaultFontSize?: number
  headers?: { default?: string; first?: string; even?: string }
  footers?: { default?: string; first?: string; even?: string }
  sections?: Array<{
    pageSetup?: { width?: number; height?: number; margins?: object; orientation?: string }
    headerFooter?: { header?: string; footer?: string }
  }>
  hasFootnotes?: boolean
  hasEndnotes?: boolean
  numberingDefinitions?: object[]
  customStyles?: object[]
}

export interface ImportResult {
  html: string
  metadata: DocMetadata
}

export interface ConverterHealthStatus {
  available: boolean
  unoserver: boolean
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
      const result = { available: false, unoserver: false }
      _healthCache = { result, ts: Date.now() }
      return result
    }

    const data = await res.json()
    const result = {
      available: data.status === 'ok',
      unoserver: data.unoserver === true,
    }
    _healthCache = { result, ts: Date.now() }
    return result
  } catch {
    const result = { available: false, unoserver: false }
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

export async function exportDocx(
  html: string,
  metadata?: Partial<DocMetadata>
): Promise<Blob> {
  const res = await fetch(`${CONVERTER_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, metadata, format: 'docx' }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Export DOCX failed (${res.status}): ${errText}`)
  }

  return res.blob()
}

export async function exportPdf(
  html: string,
  metadata?: Partial<DocMetadata>
): Promise<Blob> {
  const res = await fetch(`${CONVERTER_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, metadata, format: 'pdf' }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Export PDF failed (${res.status}): ${errText}`)
  }

  return res.blob()
}

export async function mergeExport(
  originalFile: Blob,
  editedHtml: string,
  metadata?: Partial<DocMetadata>
): Promise<Blob> {
  const formData = new FormData()
  formData.append('originalFile', originalFile)
  formData.append('editedHtml', editedHtml)
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  const res = await fetch(`${CONVERTER_BASE}/export/merge`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Merge export failed (${res.status}): ${errText}`)
  }

  return res.blob()
}
