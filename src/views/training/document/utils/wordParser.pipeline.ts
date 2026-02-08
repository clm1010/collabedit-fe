import type { ParseProgressCallback, WordFileType } from './wordParser/types'
import {
  detectWordFormat,
  isDocFormat,
  isZipFormat,
  sanitizeImagesIfNeeded
} from './wordParser.shared'
import { convertInlineStylesToTiptap } from './wordParser.postprocess'
import { parseWordDocument } from './wordParser.mammoth'
import { parseWithDocxPreview, postProcessDocxPreviewHtml } from './wordParser.preview'
import {
  parseOoxmlDocument,
  parseOoxmlDocumentEnhanced,
  validateDocxFile
} from './wordParser.ooxml'
import { isRedHeadDocument, parseRedHeadDocument } from './wordParser.redhead'
import { parseDocxToDocModel } from './docModel/parser'
import { serializeDocModelToHtml } from './docModel/serializer'
import { parseWithWorker } from './wordParser.worker'
import { logger } from '@/views/utils/logger'

/**
 * 验证解析结果是否有效（非空、包含有效 HTML 内容）
 */
const isValidParseResult = (html: string): boolean => {
  if (!html || !html.trim()) return false
  // 至少包含一个有效 HTML 标签或有实质文本内容
  const stripped = html.replace(/<[^>]*>/g, '').trim()
  if (stripped.length > 0) return true
  // 纯标签但包含有效元素（如 <img>、<table>）
  return /<(p|h[1-6]|div|span|table|img|ul|ol|li|blockquote)\b/i.test(html)
}

/**
 * 格式化错误信息，用于链式错误上下文
 */
const formatParseError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

/**
 * 解析文件内容
 * 将 ArrayBuffer 文件流解析为可在编辑器中显示的 HTML 内容
 *
 * 解析策略（三级 fallback）：红头文件 → DocModel → Mammoth
 * 最终失败时返回空字符串（不抛出异常），让 UI 层展示友好提示
 */
export const parseFileContent = async (
  data: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> => {
  try {
    logger.debug('[parseFileContent] 开始, 数据大小:', data.byteLength)

    onProgress?.(15, '正在分析文件格式...')

    const bytes = new Uint8Array(data)
    const isZip = isZipFormat(bytes)

    // ── 非 ZIP 且非 DOC：尝试作为文本/HTML 处理 ──
    if (!isZip && !isDocFormat(bytes)) {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(bytes)
      const trimmedText = text.trim()

      if (
        trimmedText.startsWith('<!DOCTYPE') ||
        trimmedText.startsWith('<html') ||
        trimmedText.startsWith('<HTML') ||
        (trimmedText.startsWith('\ufeff') && trimmedText.includes('<html'))
      ) {
        onProgress?.(80, '正在处理 HTML 内容...')
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        const result = bodyMatch
          ? sanitizeImagesIfNeeded(bodyMatch[1].trim(), 'html-body')
          : sanitizeImagesIfNeeded(text, 'html-full')
        if (isValidParseResult(result)) return result
      }

      if (trimmedText.length > 0) {
        onProgress?.(80, '正在处理文本内容...')
        return sanitizeImagesIfNeeded(text, 'text')
      }
    }

    // ── Word 文档格式检测 ──
    const format = detectWordFormat(bytes)
    logger.debug('[parseFileContent] 文件格式:', format)

    if (format === 'doc') {
      onProgress?.(25, '检测到旧版 .doc 格式...')
      const error = new Error('DOC_FORMAT_NOT_SUPPORTED')
      ;(error as any).isDocFormat = true
      throw error
    }

    if (format === 'unknown' && !isZip) {
      throw new Error('不支持的文件格式，请上传 .docx 文件')
    }

    onProgress?.(25, '检测到 Word 文档，准备解析...')

    // ── 策略 1：红头文件检测 ──
    let redHeadError: string | null = null
    try {
      const isRedHead = await isRedHeadDocument(data)
      if (isRedHead) {
        onProgress?.(30, '检测到红头文件，正在解析...')
        const result = sanitizeImagesIfNeeded(
          await parseRedHeadDocument(data, onProgress),
          'redhead'
        )
        if (isValidParseResult(result)) {
          logger.info('[parseFileContent] parser=redhead, 成功')
          return result
        }
        redHeadError = '红头文件解析结果为空'
      }
    } catch (e) {
      redHeadError = formatParseError(e)
      logger.warn('[parseFileContent] 红头文件检测/解析失败:', redHeadError)
    }

    // ── 策略 2：DocModel 解析 ──
    let docModelError: string | null = null
    try {
      const model = await parseDocxToDocModel(data, {
        onProgress,
        useDocxPreview: true,
        useMammothFallback: true,
        useZipJs: true
      })
      const html = serializeDocModelToHtml(model)
      const result = sanitizeImagesIfNeeded(convertInlineStylesToTiptap(html), 'docmodel')
      if (isValidParseResult(result)) {
        logger.info('[parseFileContent] parser=docmodel, 成功')
        return result
      }
      docModelError = '解析结果为空或无效'
      logger.warn('[parseFileContent] DocModel 结果无效，尝试 mammoth')
    } catch (e) {
      docModelError = formatParseError(e)
      logger.warn(
        '[parseFileContent] DocModel 解析失败:',
        docModelError,
        redHeadError ? `(前置: 红头=${redHeadError})` : ''
      )
    }

    // ── 策略 3：Mammoth fallback ──
    try {
      const result = sanitizeImagesIfNeeded(
        await parseWordDocument(data, onProgress),
        'mammoth'
      )
      if (isValidParseResult(result)) {
        logger.info(
          '[parseFileContent] parser=mammoth (fallback), 成功',
          docModelError ? `(DocModel失败: ${docModelError})` : ''
        )
        return result
      }
      logger.warn('[parseFileContent] mammoth 结果也为空')
    } catch (e) {
      logger.error(
        '[parseFileContent] 全部解析策略失败:',
        `mammoth=${formatParseError(e)}`,
        docModelError ? `docmodel=${docModelError}` : '',
        redHeadError ? `redhead=${redHeadError}` : ''
      )
    }

    // 所有策略失败，返回空字符串
    return ''
  } catch (error) {
    // DOC_FORMAT_NOT_SUPPORTED 等已知错误仍然抛出，让 UI 层特殊处理
    if (error instanceof Error && (error as any).isDocFormat) {
      throw error
    }
    logger.error('[parseFileContent] 解析异常:', error)
    return ''
  }
}

/**
 * 智能解析 Word 文档
 * 根据文件类型自动选择最佳解析方案
 */
export async function parseWordDocumentSmart(
  arrayBuffer: ArrayBuffer,
  fileType: WordFileType,
  onProgress?: ParseProgressCallback
): Promise<string> {
  if (fileType === 'redhead') {
    return await parseRedHeadDocument(arrayBuffer, onProgress)
  } else {
    return await parseOoxmlDocument(arrayBuffer, onProgress)
  }
}

/**
 * 检查 HTML 是否包含标题元素
 */
function hasHeadingElements(html: string): boolean {
  const headingPattern = /<h[1-6][^>]*>/i
  return headingPattern.test(html)
}

/**
 * 智能解析文档
 * 策略：优先使用 mammoth（能正确识别标题），必要时结合 docx-preview 增强效果
 */
export async function smartParseDocument(
  file: File,
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  const fileSize = file.size
  const validation = await validateDocxFile(arrayBuffer)

  logger.debug(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)

  if (validation.hasAltChunk) {
    logger.debug('检测到红头文件，使用红头文件方案解析')
    return await parseRedHeadDocument(arrayBuffer, onProgress)
  }

  logger.debug('优先使用 mammoth 解析文档（能正确识别标题）')
  try {
    onProgress?.(20, '正在使用 mammoth 解析...')
    const mammothResult = await parseWordDocument(arrayBuffer, onProgress)

    if (mammothResult && mammothResult.trim().length > 50) {
      if (hasHeadingElements(mammothResult)) {
        logger.debug('mammoth 解析成功，检测到标题元素')
        return mammothResult
      } else {
        logger.debug('mammoth 解析成功但未检测到标题，尝试大字体段落转换')
        const processedHtml = postProcessDocxPreviewHtml(mammothResult)
        if (hasHeadingElements(processedHtml)) {
          logger.debug('大字体段落转换成功，检测到标题元素')
          return processedHtml
        }
        logger.debug('使用 mammoth 结果（无标题）')
        return processedHtml
      }
    }
  } catch (e) {
    logger.warn('mammoth 解析失败:', e)
  }

  logger.debug('回退到 docx-preview 解析')

  if (fileSize < 5 * 1024 * 1024) {
    logger.debug('使用 docx-preview 高保真解析')
    try {
      const result = await parseWithDocxPreview(arrayBuffer, onProgress)
      if (result && result.trim().length > 50) {
        return result
      }
      logger.warn('docx-preview 解析结果过短，回退到增强 OOXML 解析')
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    } catch (e) {
      logger.warn('docx-preview 解析失败，回退到增强 OOXML 解析:', e)
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    }
  }

  logger.debug('使用 Web Worker 非阻塞解析（大文件）')
  try {
    return await parseWithWorker(arrayBuffer, onProgress)
  } catch (e) {
    logger.warn('Web Worker 解析失败，回退到 docx-preview:', e)
    try {
      return await parseWithDocxPreview(arrayBuffer, onProgress)
    } catch (e2) {
      logger.warn('docx-preview 也失败，使用增强 OOXML 解析:', e2)
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    }
  }
}

/**
 * 使用 Web Worker 解析（大文件）
 */
export { parseWithWorker }
