import type { ParseProgressCallback } from '../wordParser/types'
import { parseWordDocument } from '../wordParser.mammoth'
import { parseWithDocxPreview } from '../wordParser.preview'
import { parseOoxmlDocumentEnhanced, validateDocxFile } from '../wordParser.ooxml'
import { isRedHeadDocument, parseRedHeadDocument } from '../wordParser.redhead'
import { parseWithWorker } from '../wordParser.worker'
import type { DocBlock, DocModel, DocRun } from './types'
import { createHtmlDocModel, normalizeDocMetadata } from './model'
import { parseHtmlToDocModel } from './htmlParser'
import { listZipEntries } from './zipUtils'
import { parseDocxWithDocx4jsToDocModel, renderDocxWithDocx4js } from './docx4jsParser'

export interface DocModelParseOptions {
  fileName?: string
  onProgress?: ParseProgressCallback
  useDocxPreview?: boolean
  useMammothFallback?: boolean
  useZipJs?: boolean
  useWorkerForLargeFiles?: boolean
  mergeRedheadOoxml?: boolean
  useDocx4js?: boolean
}

const DEFAULT_OPTIONS: Required<
  Pick<
    DocModelParseOptions,
    | 'useDocxPreview'
    | 'useMammothFallback'
    | 'useZipJs'
    | 'useWorkerForLargeFiles'
    | 'mergeRedheadOoxml'
    | 'useDocx4js'
  >
> = {
  useDocxPreview: true,
  useMammothFallback: true,
  useZipJs: true,
  useWorkerForLargeFiles: true,
  mergeRedheadOoxml: true,
  useDocx4js: true
}

export const parseDocxToDocModel = async (
  arrayBuffer: ArrayBuffer,
  options: DocModelParseOptions = {}
): Promise<DocModel> => {
  const merged = { ...DEFAULT_OPTIONS, ...options }
  const onProgress = options.onProgress

  const metadata = normalizeDocMetadata({
    source: 'ooxml',
    method: 'ooxml-enhanced',
    fileName: options.fileName,
    fileSize: arrayBuffer.byteLength
  })

  if (merged.useZipJs && arrayBuffer.byteLength > 10 * 1024 * 1024) {
    try {
      const entries = await listZipEntries(arrayBuffer)
      metadata.zipEntries = entries.map((entry) => entry.filename)
      if (entries.some((entry) => /word\/afchunk/i.test(entry.filename))) {
        metadata.hasAltChunk = true
      }
    } catch (e) {
      metadata.warnings = [...(metadata.warnings || []), 'zip.js 读取失败，继续使用 JSZip']
    }
  }

  onProgress?.(10, '正在校验文件结构...')
  const validation = await validateDocxFile(arrayBuffer)
  if (!validation.valid) {
    const error = new Error(validation.error || 'DOCX 文件结构不完整')
    ;(error as any).isDocxInvalid = true
    throw error
  }

  metadata.hasAltChunk = metadata.hasAltChunk ?? validation.hasAltChunk

  let html = ''
  let method = 'ooxml-enhanced'

  const hasStyledRuns = (runs?: DocRun[]): boolean =>
    Boolean(runs?.some((run) => run.style && Object.keys(run.style).length > 0))

  const hasStyledBlocks = (blocks?: DocBlock[]): boolean => {
    if (!blocks) return false
    return blocks.some((block) => {
      if (block.type === 'paragraph' || block.type === 'heading') {
        if (block.style && Object.keys(block.style).length > 0) return true
        return hasStyledRuns(block.runs)
      }
      if (block.type === 'list') {
        return block.items.some((item) => hasStyledBlocks(item.blocks))
      }
      if (block.type === 'blockquote') {
        return hasStyledBlocks(block.blocks)
      }
      if (block.type === 'table') {
        return block.rows.some((row) => row.cells.some((cell) => hasStyledBlocks(cell.blocks)))
      }
      return false
    })
  }

  const hasAnyStyle = (model: DocModel): boolean => {
    if (hasStyledBlocks(model.blocks)) return true
    if (model.headers?.some((section) => hasStyledBlocks(section.blocks))) return true
    if (model.footers?.some((section) => hasStyledBlocks(section.blocks))) return true
    if (model.footnotes?.some((note) => hasStyledBlocks(note.blocks))) return true
    if (model.endnotes?.some((note) => hasStyledBlocks(note.blocks))) return true
    return false
  }

  onProgress?.(20, '正在解析文档...')
  try {
    if (validation.hasAltChunk || (await isRedHeadDocument(arrayBuffer))) {
      method = 'redhead'
      metadata.source = 'redhead'
      onProgress?.(25, '检测到红头文件，正在解析...')
      const redheadHtml = await parseRedHeadDocument(arrayBuffer, onProgress)
      if (merged.mergeRedheadOoxml) {
        const hasBodyContent = /<p|<table|<div/i.test(redheadHtml || '')
        if (!hasBodyContent || redheadHtml.trim().length < 200) {
          const ooxmlHtml = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
          html = `${redheadHtml}\n${ooxmlHtml}`
          method = 'redhead+ooxml'
        } else {
          html = redheadHtml
        }
      } else {
        html = redheadHtml
      }
    } else if (merged.useWorkerForLargeFiles && arrayBuffer.byteLength > 5 * 1024 * 1024) {
      method = 'worker-ooxml'
      metadata.source = 'ooxml'
      onProgress?.(25, '正在使用 Worker 解析大文件...')
      html = await parseWithWorker(arrayBuffer, onProgress)
      if (!/<img\b/i.test(html) && merged.useDocxPreview) {
        metadata.warnings = [
          ...(metadata.warnings || []),
          'worker-ooxml 未检测到图片，回退 docx-preview'
        ]
        method = 'docx-preview'
        metadata.source = 'preview'
        html = await parseWithDocxPreview(arrayBuffer, onProgress)
      }
    } else if (merged.useDocx4js) {
      method = 'docx4js'
      metadata.source = 'docx4js'
      metadata.method = method
      try {
        const model = await parseDocxWithDocx4jsToDocModel(arrayBuffer, metadata, onProgress)
        if (model.blocks.length > 0) {
          if (hasAnyStyle(model) || !merged.useDocxPreview) {
            metadata.method = method
            return model
          }
          metadata.warnings = [...(metadata.warnings || []), 'docx4js 样式不足，回退 docx-preview']
          method = 'docx-preview'
          metadata.source = 'preview'
          html = await parseWithDocxPreview(arrayBuffer, onProgress)
          if (html && html.trim().length >= 20) {
            metadata.method = method
            return parseHtmlToDocModel(html, metadata)
          }
        }
      } catch (e) {
        metadata.warnings = [...(metadata.warnings || []), 'docx4js 结构化解析失败，回退渲染']
      }
      html = await renderDocxWithDocx4js(arrayBuffer, onProgress)
      if (!html || html.trim().length < 20) {
        method = 'docx-preview'
        metadata.source = 'preview'
        html = await parseWithDocxPreview(arrayBuffer, onProgress)
      }
    } else if (merged.useDocxPreview) {
      method = 'docx-preview'
      metadata.source = 'preview'
      html = await parseWithDocxPreview(arrayBuffer, onProgress)
      if (!html || html.trim().length < 20) {
        method = 'ooxml-enhanced'
        metadata.source = 'ooxml'
        html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
      }
    } else {
      method = 'ooxml-enhanced'
      metadata.source = 'ooxml'
      html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    }
  } catch (e) {
    metadata.warnings = [...(metadata.warnings || []), '主解析失败，尝试后备方案']
    method = 'ooxml-enhanced'
    metadata.source = 'ooxml'
    html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
  }

  if ((!html || html.trim().length < 20) && merged.useMammothFallback) {
    method = 'mammoth'
    metadata.source = 'mammoth'
    onProgress?.(70, '正在使用后备解析...')
    html = await parseWordDocument(arrayBuffer, onProgress)
  }

  metadata.method = method
  if (html && html.trim()) {
    return parseHtmlToDocModel(html, metadata)
  }
  return createHtmlDocModel('', metadata)
}
