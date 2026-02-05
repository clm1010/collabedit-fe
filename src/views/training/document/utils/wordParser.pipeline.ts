import type { ParseProgressCallback, WordFileType } from './wordParser/types'
import {
  base64ToUint8Array,
  detectWordFormat,
  isDocFormat,
  isZipFormat,
  validateAndFixImages
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

/**
 * 解析文件内容
 * 将 base64 编码的文件流解析为可在编辑器中显示的内容
 */
export const parseFileContent = async (
  base64Data: string,
  onProgress?: ParseProgressCallback,
  options: { useDocxPreview?: boolean } = {}
): Promise<string> => {
  try {
    console.log('开始解析文件内容, 数据长度:', base64Data.length)
    const allowDocxPreview = options.useDocxPreview !== false

    onProgress?.(15, '正在分析文件格式...')

    const base64Index = base64Data.indexOf(',')
    const sanitizeImagesIfNeeded = (html: string, source: string): string => {
      if (!html) return html
      if (!/<img\b/i.test(html) && !/data:image\//i.test(html)) return html
      const sanitized = validateAndFixImages(html)
      if (sanitized !== html) {
        const count = (html.match(/data:image\//gi) || []).length
        console.info(
          `[wordParser] 修复 data:image: source=${source}, count=${count}, before=${html.length}, after=${sanitized.length}`
        )
      }
      return sanitized
    }

    if (base64Index === -1) {
      console.warn('无效的 base64 数据格式，尝试直接作为 base64 解码')
      try {
        const bytes = base64ToUint8Array(base64Data)
        if (isZipFormat(bytes)) {
          console.log('检测到 ZIP 格式（.docx），准备解析...')
          onProgress?.(20, '检测到 Word 文档...')
          const arrayBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer

          try {
            const isRedHead = await isRedHeadDocument(arrayBuffer)
            if (isRedHead) {
              console.log('检测到红头文件格式，使用红头文件解析器...')
              onProgress?.(25, '检测到红头文件，使用专用解析器...')
              console.info('[wordParser] parseFileContent: parser=redhead')
              return sanitizeImagesIfNeeded(
                await parseRedHeadDocument(arrayBuffer, onProgress),
                'redhead'
              )
            }
          } catch (e) {
            console.warn('红头文件检测失败，继续使用标准解析器:', e)
          }

          try {
            const model = await parseDocxToDocModel(arrayBuffer, {
              onProgress,
              useDocxPreview: allowDocxPreview,
              useMammothFallback: true,
              useZipJs: true
            })
            const html = serializeDocModelToHtml(model)
            console.info('[wordParser] parseFileContent: parser=docmodel')
            return sanitizeImagesIfNeeded(convertInlineStylesToTiptap(html), 'docmodel')
          } catch (e) {
            console.warn('DocModel 解析失败，回退到 mammoth:', e)
            console.info('[wordParser] parseFileContent: parser=mammoth')
            return sanitizeImagesIfNeeded(
              await parseWordDocument(arrayBuffer, onProgress),
              'mammoth'
            )
          }
        }
      } catch (e) {
        console.error('直接 base64 解码失败:', e)
      }
      return ''
    }

    const mimeType = base64Data.substring(0, base64Index)
    const base64Content = base64Data.substring(base64Index + 1)
    console.log('MIME 类型:', mimeType, 'base64 内容长度:', base64Content.length)

    onProgress?.(20, '正在解码文件内容...')

    const bytes = base64ToUint8Array(base64Content)
    console.log('解码后字节数:', bytes.length, '文件头:', bytes[0], bytes[1], bytes[2], bytes[3])

    const isZip = isZipFormat(bytes)
    console.log('是否为 ZIP 格式:', isZip)

    if (mimeType.includes('text/html') || mimeType.includes('text/plain')) {
      console.log('处理为文本类型')
      onProgress?.(80, '正在处理文本内容...')
      const decoder = new TextDecoder('utf-8')
      return sanitizeImagesIfNeeded(decoder.decode(bytes), 'text')
    } else if (
      mimeType.includes('application/vnd.openxmlformats') ||
      mimeType.includes('application/msword') ||
      mimeType.includes('application/octet-stream') ||
      isZip ||
      isDocFormat(bytes)
    ) {
      const format = detectWordFormat(bytes)
      console.log('检测到文件格式:', format)

      if (format === 'doc') {
        console.log('检测到旧版 .doc 格式，不支持')
        onProgress?.(25, '检测到旧版 .doc 格式...')
        const error = new Error('DOC_FORMAT_NOT_SUPPORTED')
        ;(error as any).isDocFormat = true
        throw error
      }

      if (format === 'unknown') {
        console.log('格式未知，尝试作为 HTML 解析...')
        onProgress?.(30, '正在识别文件内容...')
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(bytes)

        const trimmedText = text.trim()
        if (
          trimmedText.startsWith('<!DOCTYPE') ||
          trimmedText.startsWith('<html') ||
          trimmedText.startsWith('<HTML') ||
          (trimmedText.startsWith('\ufeff') && trimmedText.includes('<html'))
        ) {
          console.log('检测到 HTML 格式的 Word 兼容文件')
          onProgress?.(80, '正在处理 HTML 内容...')
          const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (bodyMatch) {
            return sanitizeImagesIfNeeded(bodyMatch[1].trim(), 'html-body')
          }
          return sanitizeImagesIfNeeded(text, 'html-full')
        }

        throw new Error('不支持的文件格式，请上传 .docx 文件')
      }

      console.log('检测到 Word 文档/二进制流，准备解析...')
      onProgress?.(25, '检测到 Word 文档，准备解析...')
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer

      try {
        const isRedHead = await isRedHeadDocument(arrayBuffer)
        if (isRedHead) {
          console.log('检测到红头文件格式，使用红头文件解析器...')
          onProgress?.(30, '检测到红头文件，正在解析...')
          console.info('[wordParser] parseFileContent: parser=redhead')
          return sanitizeImagesIfNeeded(
            await parseRedHeadDocument(arrayBuffer, onProgress),
            'redhead'
          )
        }
      } catch (e) {
        console.warn('红头文件检测失败，继续使用标准解析器:', e)
      }

      try {
        const model = await parseDocxToDocModel(arrayBuffer, {
          onProgress,
          useDocxPreview: allowDocxPreview,
          useMammothFallback: true,
          useZipJs: true
        })
        const html = serializeDocModelToHtml(model)
        console.info('[wordParser] parseFileContent: parser=docmodel')
        return sanitizeImagesIfNeeded(convertInlineStylesToTiptap(html), 'docmodel')
      } catch (e) {
        console.warn('DocModel 解析失败，回退到 mammoth:', e)
        console.info('[wordParser] parseFileContent: parser=mammoth')
        return sanitizeImagesIfNeeded(await parseWordDocument(arrayBuffer, onProgress), 'mammoth')
      }
    }

    throw new Error('不支持的文件格式')
  } catch (error) {
    console.error('文件解析失败:', error)
    throw error
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

  console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)

  if (validation.hasAltChunk) {
    console.log('检测到红头文件，使用红头文件方案解析')
    return await parseRedHeadDocument(arrayBuffer, onProgress)
  }

  console.log('优先使用 mammoth 解析文档（能正确识别标题）')
  try {
    onProgress?.(20, '正在使用 mammoth 解析...')
    const mammothResult = await parseWordDocument(arrayBuffer, onProgress)

    if (mammothResult && mammothResult.trim().length > 50) {
      if (hasHeadingElements(mammothResult)) {
        console.log('mammoth 解析成功，检测到标题元素')
        return mammothResult
      } else {
        console.log('mammoth 解析成功但未检测到标题，尝试大字体段落转换')
        const processedHtml = postProcessDocxPreviewHtml(mammothResult)
        if (hasHeadingElements(processedHtml)) {
          console.log('大字体段落转换成功，检测到标题元素')
          return processedHtml
        }
        console.log('使用 mammoth 结果（无标题）')
        return processedHtml
      }
    }
  } catch (e) {
    console.warn('mammoth 解析失败:', e)
  }

  console.log('回退到 docx-preview 解析')

  if (fileSize < 5 * 1024 * 1024) {
    console.log('使用 docx-preview 高保真解析')
    try {
      const result = await parseWithDocxPreview(arrayBuffer, onProgress)
      if (result && result.trim().length > 50) {
        return result
      }
      console.warn('docx-preview 解析结果过短，回退到增强 OOXML 解析')
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    } catch (e) {
      console.warn('docx-preview 解析失败，回退到增强 OOXML 解析:', e)
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    }
  }

  console.log('使用 Web Worker 非阻塞解析（大文件）')
  try {
    return await parseWithWorker(arrayBuffer, onProgress)
  } catch (e) {
    console.warn('Web Worker 解析失败，回退到 docx-preview:', e)
    try {
      return await parseWithDocxPreview(arrayBuffer, onProgress)
    } catch (e2) {
      console.warn('docx-preview 也失败，使用增强 OOXML 解析:', e2)
      return await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
    }
  }
}

/**
 * 使用 Web Worker 解析（大文件）
 */
export { parseWithWorker }
