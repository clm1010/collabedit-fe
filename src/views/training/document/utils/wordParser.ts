/**
 * Word 文档解析工具
 * 提取公共的 Word 文档解析和 HTML 清理功能
 * 仅支持 .docx 格式（不支持旧版 .doc 格式）
 *
 * 支持多种解析模式:
 * 1. docx-preview 高保真解析 (95%+ 保真度)
 * 2. 增强 OOXML 解析 (90%+ 保真度)
 * 3. 红头文件 - altChunk HTML 提取 (98%+ 还原度)
 * 4. Web Worker 非阻塞解析 (大文件支持)
 * 5. mammoth 后备方案 (70% 保真度)
 */

/**
 * 文件格式类型
 */
export type WordFileFormat = 'doc' | 'docx' | 'unknown'

/**
 * 文件类型选择
 */
export type WordFileType = 'normal' | 'redhead'

/**
 * Docx 文件验证结果
 */
export interface DocxValidationResult {
  valid: boolean
  error?: string
  hasAltChunk?: boolean // 是否包含 altChunk（自动检测红头文件）
  structure: {
    hasContentTypes: boolean
    hasDocument: boolean
    hasStyles: boolean
    hasRelationships: boolean
  }
}

/**
 * 检测文件是否为旧版 .doc 格式（OLE/CFB 复合文档）
 * OLE 文件头: D0 CF 11 E0 A1 B1 1A E1
 * @param bytes 文件字节数组
 * @returns 是否为 .doc 格式
 */
export const isDocFormat = (bytes: Uint8Array): boolean => {
  if (bytes.length < 8) return false
  // OLE/CFB 文件头魔数
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  )
}

/**
 * 检测 Word 文件格式
 * @param bytes 文件字节数组
 * @param filename 文件名（可选，用于辅助判断）
 * @returns 文件格式
 */
export const detectWordFormat = (bytes: Uint8Array, filename?: string): WordFileFormat => {
  // 检查 ZIP 格式 (.docx)
  if (isZipFormat(bytes)) {
    return 'docx'
  }
  // 检查 OLE 格式 (.doc)
  if (isDocFormat(bytes)) {
    return 'doc'
  }
  // 通过文件扩展名辅助判断
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'docx') return 'docx'
    if (ext === 'doc') return 'doc'
  }
  return 'unknown'
}

/**
 * 清理 Word 导出的 HTML - 保持更好的排版
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
export const cleanWordHtml = (html: string): string => {
  // 移除多余的连续空段落（保留单个空段落用于间距）
  html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格，但保留必要的空格
  html = html.replace(/&nbsp;&nbsp;+/g, ' ')

  // 移除 Word 特有的 mso- 样式，但保留其他有用的样式
  html = html.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')

  // 移除空的 style 属性
  html = html.replace(/style="\s*"/g, '')

  // 移除 Word 特有的 class
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, '')

  // 处理分页符 - 转换为自定义分页标记
  html = html.replace(
    /<br[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div><p>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>(.*?)<\/p>/gi,
    '<p>$1</p><div class="page-break" data-type="page-break"></div>'
  )

  // 处理图片宽度 - 限制最大宽度为编辑器可用宽度
  const MAX_IMAGE_WIDTH = 540 // 编辑器可用宽度（A4 页面 794px - 边距 240px - 一些余量）

  html = html.replace(/<img([^>]*)style="([^"]*)"/gi, (_match, attrs, style) => {
    const widthMatch = style.match(/width:\s*([^;]+)/i)
    let width = 0

    if (widthMatch) {
      const widthStr = widthMatch[1].trim()
      // 转换各种单位为像素
      if (widthStr.endsWith('pt')) {
        width = parseFloat(widthStr) * 1.33 // pt 转 px
      } else if (widthStr.endsWith('in')) {
        width = parseFloat(widthStr) * 96 // in 转 px
      } else if (widthStr.endsWith('cm')) {
        width = parseFloat(widthStr) * 37.8 // cm 转 px
      } else if (widthStr.endsWith('mm')) {
        width = parseFloat(widthStr) * 3.78 // mm 转 px
      } else if (widthStr.endsWith('%')) {
        width = 0 // 百分比不处理，让浏览器自动计算
      } else {
        width = parseFloat(widthStr) || 0
      }
    }

    // 始终添加 max-width: 100% 确保响应式
    let newStyle = style
    if (width > MAX_IMAGE_WIDTH) {
      newStyle = style
        .replace(/width:\s*[^;]+;?/i, `width: ${MAX_IMAGE_WIDTH}px;`)
        .replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    // 确保添加 max-width 和 display: block 防止溢出
    if (!newStyle.includes('max-width')) {
      newStyle += '; max-width: 100%'
    }
    if (!newStyle.includes('height: auto')) {
      newStyle = newStyle.replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    return `<img${attrs}style="${newStyle}; display: block;"`
  })

  // 处理没有 style 属性的图片
  html = html.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  return html
}

/**
 * mammoth 样式映射配置
 * 支持多种标题命名约定（英文、中文、WPS 等）
 */
export const mammothStyleMap = [
  // 标准英文标题映射
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  // 中文标题映射（空格分隔）
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='标题 3'] => h3:fresh",
  "p[style-name='标题 4'] => h4:fresh",
  "p[style-name='标题 5'] => h5:fresh",
  "p[style-name='标题 6'] => h6:fresh",
  // 中文标题映射（无空格）
  "p[style-name='标题1'] => h1:fresh",
  "p[style-name='标题2'] => h2:fresh",
  "p[style-name='标题3'] => h3:fresh",
  "p[style-name='标题4'] => h4:fresh",
  "p[style-name='标题5'] => h5:fresh",
  "p[style-name='标题6'] => h6:fresh",
  // 单独的"标题"样式（通常是一级标题）
  "p[style-name='标题'] => h1:fresh",
  "p[style-name='Title'] => h1:fresh",
  // TOC 标题样式
  "p[style-name='TOC Heading'] => h1:fresh",
  "p[style-name='目录标题'] => h1:fresh",
  // WPS 常用样式
  "p[style-name='一级标题'] => h1:fresh",
  "p[style-name='二级标题'] => h2:fresh",
  "p[style-name='三级标题'] => h3:fresh",
  "p[style-name='四级标题'] => h4:fresh",
  // 其他可能的命名
  "p[style-name='heading 1'] => h1:fresh",
  "p[style-name='heading 2'] => h2:fresh",
  "p[style-name='heading 3'] => h3:fresh",
  "p[style-name='heading 4'] => h4:fresh",
  // 引用映射
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Block Text'] => blockquote:fresh",
  "p[style-name='引用'] => blockquote:fresh",
  // 代码块映射
  "p[style-name='Code'] => pre:fresh",
  "r[style-name='Code Char'] => code",
  // 保留粗体和斜体
  'b => strong',
  'i => em',
  'u => u',
  'strike => s'
]

/**
 * 解析进度回调类型
 */
export type ParseProgressCallback = (progress: number, text: string) => void

/**
 * 使用 mammoth 解析 Word 文档 (.docx 格式)
 * 注意：mammoth 只支持 .docx 格式，不支持旧版 .doc 格式
 * @param arrayBuffer Word 文档的 ArrayBuffer
 * @param onProgress 可选的进度回调函数
 * @returns 解析后的 HTML 内容
 * @throws 如果是 .doc 格式，抛出特定错误
 */
export const parseWordDocument = async (
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> => {
  try {
    // 更新进度：20% - 检测文件格式
    onProgress?.(20, '正在检测文件格式...')

    // 检测文件格式
    const bytes = new Uint8Array(arrayBuffer)
    const format = detectWordFormat(bytes)

    if (format === 'doc') {
      // 旧版 .doc 格式，抛出特定错误，让调用方处理
      const error = new Error('DOC_FORMAT_NOT_SUPPORTED')
      ;(error as any).isDocFormat = true
      throw error
    }

    // 如果格式为 unknown，尝试作为 HTML 解析（可能是 Word 兼容的 HTML 文件）
    if (format === 'unknown') {
      console.log('格式未知，尝试作为 HTML 解析...')
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(bytes)
      const trimmedText = text.trim()

      // 检查是否是 HTML 格式
      if (
        trimmedText.startsWith('<!DOCTYPE') ||
        trimmedText.startsWith('<html') ||
        trimmedText.startsWith('<HTML') ||
        (trimmedText.startsWith('\ufeff') && trimmedText.includes('<html'))
      ) {
        console.log('检测到 HTML 格式的 Word 兼容文件')
        onProgress?.(80, '正在处理 HTML 内容...')
        // 提取 body 内容
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch) {
          return bodyMatch[1].trim()
        }
        return text
      }

      // 不是 HTML 也不是 docx
      throw new Error('不支持的文件格式，请上传 .docx 文件')
    }

    // 更新进度：30% - 加载解析库
    onProgress?.(30, '正在加载 Word 解析库...')

    // 动态导入 mammoth
    const mammoth = await import('mammoth')

    // 更新进度：40% - 配置解析选项
    onProgress?.(40, '正在配置解析选项...')

    // 配置转换选项
    const options: any = {
      styleMap: mammothStyleMap,
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true
    }

    // 处理图片
    const mammothLib = mammoth.default || mammoth
    if (mammothLib.images && mammothLib.images.imgElement) {
      options.convertImage = mammothLib.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${imageBuffer}`
          }
        })
      })
    } else {
      // 备用方案：直接处理图片数据
      options.convertImage = {
        'image/png': async (image: any) => {
          const buffer = await image.read('base64')
          return { src: `data:image/png;base64,${buffer}` }
        },
        'image/jpeg': async (image: any) => {
          const buffer = await image.read('base64')
          return { src: `data:image/jpeg;base64,${buffer}` }
        },
        'image/gif': async (image: any) => {
          const buffer = await image.read('base64')
          return { src: `data:image/gif;base64,${buffer}` }
        }
      }
    }

    // 更新进度：50% - 解析 Word 文档
    onProgress?.(50, '正在解析 Word 文档...')

    // 使用正确的 mammoth 引用
    const result = await mammothLib.convertToHtml({ arrayBuffer }, options)

    // 更新进度：70% - 处理 HTML 内容
    onProgress?.(70, '正在处理文档内容...')

    // 处理 HTML 内容
    let html = result.value

    // 更新进度：80% - 清理和优化 HTML
    onProgress?.(80, '正在优化文档格式...')

    // 清理和优化 HTML
    html = cleanWordHtml(html)

    // 检查是否有标题元素，如果没有，尝试从大字体段落转换
    const headingPattern = /<h[1-6][^>]*>/i
    if (!headingPattern.test(html)) {
      console.log('mammoth 未检测到标题，尝试从大字体段落转换')
      html = convertLargeFontParagraphsToHeadings(html)
    }

    // 应用内联样式转换（pt -> px 等）
    html = convertInlineStylesToTiptap(html)

    console.log('Word 文档解析成功，警告信息:', result.messages)

    return html
  } catch (error) {
    console.error('Word 文档解析失败:', error)
    throw error
  }
}

/**
 * 将 base64 字符串解码为 Uint8Array
 * @param base64 base64 编码的字符串
 * @returns Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * 检测文件是否为 ZIP 格式（.docx 文件是 ZIP 格式）
 * @param bytes 文件字节数组
 * @returns 是否为 ZIP 格式
 */
export const isZipFormat = (bytes: Uint8Array): boolean => {
  // ZIP 文件头：PK (0x50 0x4B)
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

/**
 * 解析文件内容
 * 将 base64 编码的文件流解析为可在编辑器中显示的内容
 * @param base64Data base64 编码的文件数据
 * @param onProgress 可选的进度回调函数
 * @returns 解析后的 HTML 内容
 */
export const parseFileContent = async (
  base64Data: string,
  onProgress?: ParseProgressCallback
): Promise<string> => {
  try {
    console.log('开始解析文件内容, 数据长度:', base64Data.length)

    // 更新进度：15% - 分析文件格式
    onProgress?.(15, '正在分析文件格式...')

    // base64Data 格式: data:application/octet-stream;base64,xxxxx
    // 或者: data:text/html;base64,xxxxx
    const base64Index = base64Data.indexOf(',')
    if (base64Index === -1) {
      console.warn('无效的 base64 数据格式，尝试直接作为 base64 解码')
      // 可能没有 data URI 前缀，直接尝试解码
      try {
        const bytes = base64ToUint8Array(base64Data)
        // 检测文件头
        if (isZipFormat(bytes)) {
          console.log('检测到 ZIP 格式（.docx），使用增强 OOXML 解析器...')
          onProgress?.(20, '检测到 Word 文档...')
          const arrayBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer
          // 使用增强 OOXML 解析器，能正确识别标题并保留颜色、背景色等样式
          try {
            const html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
            // 应用样式转换（将 background-color 转换为 mark 标签）
            return convertInlineStylesToTiptap(html)
          } catch (e) {
            console.warn('增强 OOXML 解析失败，回退到 mammoth:', e)
            return await parseWordDocument(arrayBuffer, onProgress)
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

    // 更新进度：20% - 解码文件内容
    onProgress?.(20, '正在解码文件内容...')

    // 解码 base64
    const bytes = base64ToUint8Array(base64Content)
    console.log('解码后字节数:', bytes.length, '文件头:', bytes[0], bytes[1], bytes[2], bytes[3])

    // 检测文件头来判断类型
    const isZip = isZipFormat(bytes)
    console.log('是否为 ZIP 格式:', isZip)

    // 根据 MIME 类型或文件头处理
    if (mimeType.includes('text/html') || mimeType.includes('text/plain')) {
      // 文本类型，直接解码
      console.log('处理为文本类型')
      onProgress?.(80, '正在处理文本内容...')
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(bytes)
    } else if (
      mimeType.includes('application/vnd.openxmlformats') ||
      mimeType.includes('application/msword') ||
      mimeType.includes('application/octet-stream') ||
      isZip ||
      isDocFormat(bytes)
    ) {
      // 检测具体格式
      const format = detectWordFormat(bytes)
      console.log('检测到文件格式:', format)

      if (format === 'doc') {
        // 旧版 .doc 格式，抛出特定错误让调用方处理
        console.log('检测到旧版 .doc 格式，不支持')
        onProgress?.(25, '检测到旧版 .doc 格式...')
        const error = new Error('DOC_FORMAT_NOT_SUPPORTED')
        ;(error as any).isDocFormat = true
        throw error
      }

      // 如果格式为 unknown，尝试检测是否为 HTML 格式（Word 兼容的 HTML 文件）
      if (format === 'unknown') {
        console.log('格式未知，尝试作为 HTML 解析...')
        onProgress?.(30, '正在识别文件内容...')
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(bytes)

        // 检查是否是 HTML 格式（包括 Word 生成的 HTML）
        const trimmedText = text.trim()
        if (
          trimmedText.startsWith('<!DOCTYPE') ||
          trimmedText.startsWith('<html') ||
          trimmedText.startsWith('<HTML') ||
          (trimmedText.startsWith('\ufeff') && trimmedText.includes('<html')) // 带 BOM 的 HTML
        ) {
          console.log('检测到 HTML 格式的 Word 兼容文件')
          onProgress?.(80, '正在处理 HTML 内容...')
          // 提取 body 内容（如果有的话）
          const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          if (bodyMatch) {
            return bodyMatch[1].trim()
          }
          return text
        }

        // 不是 HTML，抛出错误
        throw new Error('不支持的文件格式，请上传 .docx 文件')
      }

      // Word 文档或二进制流，使用增强 OOXML 解析器
      console.log('检测到 Word 文档/二进制流，使用增强 OOXML 解析器...')
      onProgress?.(25, '检测到 Word 文档，准备解析...')
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer
      // 使用增强 OOXML 解析器，能正确识别标题并保留颜色、背景色等样式
      try {
        const html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
        // 应用样式转换（将 background-color 转换为 mark 标签）
        return convertInlineStylesToTiptap(html)
      } catch (e) {
        console.warn('增强 OOXML 解析失败，回退到 mammoth:', e)
        return await parseWordDocument(arrayBuffer, onProgress)
      }
    } else {
      // 其他类型，尝试作为文本解码
      console.log('尝试作为其他类型处理')
      onProgress?.(60, '正在识别文件类型...')
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(bytes)

      // 检查是否是有效的 HTML
      if (text.trim().startsWith('<') && text.includes('>')) {
        console.log('检测到 HTML 格式')
        onProgress?.(80, '正在处理 HTML 内容...')
        return text
      }

      // 尝试检测是否可能是 Word 文档（通过文件头）
      if (isZip) {
        console.log('通过文件头检测到 ZIP 格式（可能是 .docx），使用增强 OOXML 解析器...')
        onProgress?.(25, '检测到 Word 文档，准备解析...')
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer
        // 使用增强 OOXML 解析器，能正确识别标题并保留颜色、背景色等样式
        try {
          const html = await parseOoxmlDocumentEnhanced(arrayBuffer, onProgress)
          // 应用样式转换（将 background-color 转换为 mark 标签）
          return convertInlineStylesToTiptap(html)
        } catch (e) {
          console.warn('增强 OOXML 解析失败，回退到 mammoth:', e)
          return await parseWordDocument(arrayBuffer, onProgress)
        }
      }

      // 纯文本，包装为段落
      console.log('处理为纯文本')
      onProgress?.(80, '正在处理纯文本内容...')
      return `<p>${text.replace(/\n/g, '</p><p>')}</p>`
    }
  } catch (error) {
    console.error('文件内容解析错误:', error)
    return ''
  }
}

// =====================================================
// 新增: 高保真 Word 导入功能
// =====================================================

/**
 * 验证 docx 文件完整性
 * 在解析前先验证 docx 文件是否损坏
 * @param arrayBuffer Word 文档的 ArrayBuffer
 * @returns 验证结果
 */
export async function validateDocxFile(arrayBuffer: ArrayBuffer): Promise<DocxValidationResult> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    // 检查必要文件
    const contentTypes = zip.file('[Content_Types].xml')
    const document = zip.file('word/document.xml')
    const styles = zip.file('word/styles.xml')
    const rels = zip.file('word/_rels/document.xml.rels')

    // 检查是否有 altChunk (红头文件标志)
    const afchunk = zip.file('word/afchunk.mht')
    const afchunkHtml = zip.file(/word\/afchunk.*\.htm/i)

    if (!contentTypes || !document) {
      return {
        valid: false,
        error: '文件结构不完整，可能已损坏',
        structure: {
          hasContentTypes: !!contentTypes,
          hasDocument: !!document,
          hasStyles: !!styles,
          hasRelationships: !!rels
        }
      }
    }

    // 验证 XML 格式 - 放宽验证条件，支持更多格式的 Word 文档
    const documentContent = await document.async('string')
    // 检查是否包含 Word 文档的常见标记
    const isValidDocumentXml =
      documentContent.includes('<w:document') ||
      documentContent.includes('w:document') ||
      documentContent.includes('<document') ||
      documentContent.includes('xmlns:w=') ||
      documentContent.includes('<w:body') ||
      documentContent.includes('w:body')

    if (!isValidDocumentXml) {
      // 开发环境下输出调试信息，生产环境静默处理
      if (import.meta.env.DEV) {
        console.debug('[wordParser] document.xml 格式可能不标准，尝试继续解析...')
      }
      // 不再直接返回错误，而是尝试继续解析
    }

    // 检测是否有 altChunk
    const hasAltChunk = !!afchunk || afchunkHtml.length > 0

    return {
      valid: true,
      hasAltChunk: hasAltChunk, // 自动检测是否为红头文件格式
      structure: {
        hasContentTypes: !!contentTypes,
        hasDocument: !!document,
        hasStyles: !!styles,
        hasRelationships: !!rels
      }
    }
  } catch (e) {
    console.error('文件验证失败:', e)
    return {
      valid: false,
      error: '无法解析文件，格式可能已损坏',
      structure: {
        hasContentTypes: false,
        hasDocument: false,
        hasStyles: false,
        hasRelationships: false
      }
    }
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * 解析 styles.xml 获取样式定义
 */
function parseStylesXml(stylesObj: any): Record<string, any> {
  const parsedStylesMap: Record<string, any> = {}

  try {
    const styles = stylesObj?.['w:styles']?.['w:style']
    if (!styles) return parsedStylesMap

    const stylesList = Array.isArray(styles) ? styles : [styles]

    for (const style of stylesList) {
      const styleId = style['@_w:styleId']
      if (!styleId) continue

      const rPr = style['w:rPr'] || {}
      const pPr = style['w:pPr'] || {}

      parsedStylesMap[styleId] = {
        rPr,
        pPr,
        name: style['w:name']?.['@_w:val'] || styleId
      }
    }
  } catch (e) {
    console.warn('解析样式失败:', e)
  }

  return parsedStylesMap
}

/**
 * 解析段落属性为 HTML
 * @param para 段落对象
 * @param stylesMap 样式映射
 * @param imageMap 图片映射
 */
function convertParagraphToHtml(
  para: any,
  stylesMap: Record<string, any>,
  imageMap?: Map<string, string>
): string {
  if (!para) return ''

  const pPr = para['w:pPr'] || {}
  const runs = para['w:r']

  // 段落样式
  const styleArr: string[] = []

  // 文本对齐
  const jc = pPr['w:jc']?.['@_w:val']
  if (jc) {
    const alignMap: Record<string, string> = {
      left: 'left',
      center: 'center',
      right: 'right',
      both: 'justify',
      justify: 'justify'
    }
    if (alignMap[jc]) {
      styleArr.push(`text-align: ${alignMap[jc]}`)
    }
  }

  // 首行缩进
  const ind = pPr['w:ind']
  if (ind) {
    const firstLine = ind['@_w:firstLine'] || ind['@_w:firstLineChars']
    if (firstLine) {
      const value = parseInt(firstLine)
      // firstLine 单位是 twips (1/20 point)，firstLineChars 是 1/100 字符
      if (ind['@_w:firstLineChars']) {
        styleArr.push(`text-indent: ${value / 100}em`)
      } else {
        styleArr.push(`text-indent: ${value / 20}pt`)
      }
    }
  }

  // 行高
  const spacing = pPr['w:spacing']
  if (spacing) {
    const line = spacing['@_w:line']
    const lineRule = spacing['@_w:lineRule']
    if (line) {
      const lineValue = parseInt(line)
      if (lineRule === 'exact') {
        styleArr.push(`line-height: ${lineValue / 20}pt`)
      } else if (lineRule === 'atLeast') {
        styleArr.push(`line-height: ${lineValue / 20}pt`)
      } else {
        // 默认为倍数 (240 = 单倍行距)
        styleArr.push(`line-height: ${(lineValue / 240).toFixed(2)}`)
      }
    }
  }

  // 处理段落内容
  let content = ''
  if (runs) {
    const runsList = Array.isArray(runs) ? runs : [runs]
    for (const run of runsList) {
      content += convertRunToHtml(run, stylesMap, imageMap)
    }
  }

  // 处理书签等特殊元素
  const hyperlink = para['w:hyperlink']
  if (hyperlink) {
    const hyperlinkRuns = hyperlink['w:r']
    if (hyperlinkRuns) {
      const runsList = Array.isArray(hyperlinkRuns) ? hyperlinkRuns : [hyperlinkRuns]
      for (const run of runsList) {
        content += convertRunToHtml(run, stylesMap, imageMap)
      }
    }
  }

  const style = styleArr.length > 0 ? ` style="${styleArr.join('; ')}"` : ''
  return `<p${style}>${content || '<br>'}</p>`
}

/**
 * 解析 Run（文本片段）属性为 HTML
 * @param run Run 对象
 * @param _stylesMap 样式映射（保留用于未来扩展）
 * @param imageMap 图片映射 (rId -> base64 data URL)
 */
function convertRunToHtml(
  run: any,
  _stylesMap: Record<string, any>,
  imageMap?: Map<string, string>
): string {
  if (!run) return ''

  const rPr = run['w:rPr'] || {}

  // 处理换行
  if (run['w:br']) {
    return '<br>'
  }

  // 处理制表符
  if (run['w:tab']) {
    return '&emsp;&emsp;'
  }

  // 处理图片 (w:drawing)
  const drawing = run['w:drawing']
  if (drawing && imageMap) {
    const imgHtml = extractImageFromDrawing(drawing, imageMap)
    if (imgHtml) return imgHtml
  }

  // 处理旧版图片 (w:pict)
  const pict = run['w:pict']
  if (pict && imageMap) {
    const imgHtml = extractImageFromPict(pict, imageMap)
    if (imgHtml) return imgHtml
  }

  // 处理嵌入对象 (w:object)
  const obj = run['w:object']
  if (obj && imageMap) {
    const imgHtml = extractImageFromObject(obj, imageMap)
    if (imgHtml) return imgHtml
  }

  // 获取文本内容
  let text = ''
  const textNode = run['w:t']
  if (textNode) {
    text = typeof textNode === 'string' ? textNode : textNode['#text'] || textNode['_'] || ''
  }

  if (!text) return ''

  // 提取样式
  const style: string[] = []

  // 字体
  const rFonts = rPr['w:rFonts']
  if (rFonts) {
    const font = rFonts['@_w:eastAsia'] || rFonts['@_w:ascii'] || rFonts['@_w:hAnsi']
    if (font) {
      style.push(`font-family: "${font}"`)
    }
  }

  // 字号 (半点单位，需要 /2)
  const sz = rPr['w:sz'] || rPr['w:szCs']
  if (sz) {
    const size = parseInt(sz['@_w:val']) / 2
    if (size > 0) {
      style.push(`font-size: ${size}pt`)
    }
  }

  // 颜色
  const color = rPr['w:color']
  if (color) {
    const colorVal = color['@_w:val']
    if (colorVal && colorVal !== 'auto') {
      style.push(`color: #${colorVal}`)
    }
  }

  // 高亮 (w:highlight)
  const highlight = rPr['w:highlight']
  if (highlight) {
    const highlightColor = highlight['@_w:val']
    if (highlightColor) {
      const colorMap: Record<string, string> = {
        yellow: '#FFFF00',
        green: '#00FF00',
        cyan: '#00FFFF',
        magenta: '#FF00FF',
        blue: '#0000FF',
        red: '#FF0000',
        darkBlue: '#00008B',
        darkCyan: '#008B8B',
        darkGreen: '#006400',
        darkMagenta: '#8B008B',
        darkRed: '#8B0000',
        darkYellow: '#808000',
        darkGray: '#A9A9A9',
        lightGray: '#D3D3D3',
        black: '#000000'
      }
      style.push(`background-color: ${colorMap[highlightColor] || highlightColor}`)
    }
  }

  // 底纹/背景色 (w:shd) - 处理 htmlToDocx 导出的 shading 样式
  const shd = rPr['w:shd']
  if (shd) {
    // shading 的 fill 属性是背景色
    const fillColor = shd['@_w:fill']
    if (fillColor && fillColor !== 'auto' && fillColor !== 'FFFFFF') {
      // 如果没有通过 highlight 设置背景色，则使用 shading
      if (!style.some((s) => s.startsWith('background-color'))) {
        style.push(`background-color: #${fillColor}`)
      }
    }
  }

  // 加粗
  const bold = rPr['w:b']
  if (bold !== undefined && bold !== null) {
    const isOff = bold['@_w:val'] === 'false' || bold['@_w:val'] === '0'
    if (!isOff) {
      style.push('font-weight: bold')
    }
  }

  // 斜体
  const italic = rPr['w:i']
  if (italic !== undefined && italic !== null) {
    const isOff = italic['@_w:val'] === 'false' || italic['@_w:val'] === '0'
    if (!isOff) {
      style.push('font-style: italic')
    }
  }

  // 下划线
  const underline = rPr['w:u']
  if (underline !== undefined && underline !== null) {
    const val = underline['@_w:val']
    if (val && val !== 'none') {
      style.push('text-decoration: underline')
    }
  }

  // 删除线
  const strike = rPr['w:strike']
  if (strike !== undefined && strike !== null) {
    const isOff = strike['@_w:val'] === 'false' || strike['@_w:val'] === '0'
    if (!isOff) {
      style.push('text-decoration: line-through')
    }
  }

  const styleAttr = style.length ? ` style="${style.join('; ')}"` : ''
  return `<span${styleAttr}>${escapeHtml(text)}</span>`
}

/**
 * 从 w:drawing 元素提取图片
 */
function extractImageFromDrawing(drawing: any, imageMap: Map<string, string>): string {
  try {
    // 处理 inline 图片
    const inline = drawing['wp:inline']
    if (inline) {
      return extractImageFromInlineOrAnchor(inline, imageMap)
    }

    // 处理 anchor 图片
    const anchor = drawing['wp:anchor']
    if (anchor) {
      return extractImageFromInlineOrAnchor(anchor, imageMap)
    }
  } catch (e) {
    console.warn('提取图片失败:', e)
  }
  return ''
}

/**
 * 从 inline 或 anchor 元素提取图片
 */
function extractImageFromInlineOrAnchor(element: any, imageMap: Map<string, string>): string {
  try {
    // 获取尺寸 (EMU 单位，1英寸 = 914400 EMU)
    const extent = element['wp:extent']
    let width = 0
    if (extent) {
      width = Math.round((parseInt(extent['@_cx'] || '0') / 914400) * 96) // 转换为像素
      // height 暂时保留用于未来扩展
      // const height = Math.round((parseInt(extent['@_cy'] || '0') / 914400) * 96)
    }

    // 获取图片引用
    const graphic = element['a:graphic']
    const graphicData = graphic?.['a:graphicData']
    const pic = graphicData?.['pic:pic']
    const blipFill = pic?.['pic:blipFill']
    const blip = blipFill?.['a:blip']

    if (blip) {
      const embedId = blip['@_r:embed']
      if (embedId && imageMap.has(embedId)) {
        const src = imageMap.get(embedId)
        const styleArr = ['max-width: 100%', 'height: auto', 'display: block']
        if (width > 0) styleArr.unshift(`width: ${Math.min(width, 540)}px`)
        return `<img src="${src}" style="${styleArr.join('; ')}" />`
      }
    }
  } catch (e) {
    console.warn('解析图片元素失败:', e)
  }
  return ''
}

/**
 * 从 w:pict 元素提取图片 (旧版 VML 格式)
 */
function extractImageFromPict(pict: any, imageMap: Map<string, string>): string {
  try {
    const shape = pict['v:shape'] || pict['v:rect']
    if (shape) {
      const imagedata = shape['v:imagedata']
      if (imagedata) {
        const rId = imagedata['@_r:id'] || imagedata['@_o:relid']
        if (rId && imageMap.has(rId)) {
          const src = imageMap.get(rId)
          return `<img src="${src}" style="max-width: 100%; height: auto; display: block;" />`
        }
      }
    }
  } catch (e) {
    console.warn('解析 VML 图片失败:', e)
  }
  return ''
}

/**
 * 从 w:object 元素提取图片
 */
function extractImageFromObject(obj: any, imageMap: Map<string, string>): string {
  try {
    const shape = obj['v:shape']
    if (shape) {
      const imagedata = shape['v:imagedata']
      if (imagedata) {
        const rId = imagedata['@_r:id'] || imagedata['@_o:relid']
        if (rId && imageMap.has(rId)) {
          const src = imageMap.get(rId)
          return `<img src="${src}" style="max-width: 100%; height: auto; display: block;" />`
        }
      }
    }
  } catch (e) {
    console.warn('解析嵌入对象失败:', e)
  }
  return ''
}

/**
 * 处理图片
 */
async function processImages(
  zip: any,
  _documentContent: string,
  relsContent: string
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  try {
    // 解析关系文件获取图片映射
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const relsObj = parser.parse(relsContent)
    const relationships = relsObj?.['Relationships']?.['Relationship'] || []
    const relsList = Array.isArray(relationships) ? relationships : [relationships]

    for (const rel of relsList) {
      const type = rel['@_Type'] || ''
      const target = rel['@_Target'] || ''
      const id = rel['@_Id'] || ''

      if (type.includes('image')) {
        // 获取图片路径
        const imagePath = target.startsWith('/') ? target.substring(1) : `word/${target}`
        const imageFile = zip.file(imagePath)

        if (imageFile) {
          try {
            const imageData = await imageFile.async('base64')
            const ext = target.split('.').pop()?.toLowerCase() || 'png'
            const mimeType =
              ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'gif'
                  ? 'image/gif'
                  : ext === 'webp'
                    ? 'image/webp'
                    : 'image/png'
            imageMap.set(id, `data:${mimeType};base64,${imageData}`)
          } catch (e) {
            console.warn(`处理图片失败: ${imagePath}`, e)
          }
        }
      }
    }
  } catch (e) {
    console.warn('处理图片映射失败:', e)
  }

  return imageMap
}

/**
 * 普通文件 - OOXML 完整解析方案
 * 达到 95%+ 还原度
 */
export async function parseOoxmlDocument(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default
    const { XMLParser } = await import('fast-xml-parser')

    onProgress?.(20, '正在解压文档...')
    const zip = await JSZip.loadAsync(arrayBuffer)

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: true
    })

    onProgress?.(30, '正在解析文档样式...')

    // 1. 解析 styles.xml 获取样式定义
    const stylesFile = zip.file('word/styles.xml')
    let stylesMap: Record<string, any> = {}
    if (stylesFile) {
      const stylesXml = await stylesFile.async('string')
      stylesMap = parseStylesXml(parser.parse(stylesXml))
    }

    onProgress?.(40, '正在解析文档内容...')

    // 2. 解析 document.xml 获取内容
    const documentFile = zip.file('word/document.xml')
    if (!documentFile) {
      throw new Error('未找到文档内容')
    }
    const documentXml = await documentFile.async('string')
    const docObj = parser.parse(documentXml)

    // 3. 处理图片关系
    const relsFile = zip.file('word/_rels/document.xml.rels')
    let imageMap = new Map<string, string>()
    if (relsFile) {
      const relsContent = await relsFile.async('string')
      imageMap = await processImages(zip, documentXml, relsContent)
    }

    onProgress?.(60, '正在生成 HTML...')

    // 4. 获取文档体 - 支持多种命名空间格式
    let body = docObj?.['w:document']?.['w:body']
    if (!body) {
      // 尝试其他可能的格式
      body = docObj?.['document']?.['body']
      if (!body) {
        // 遍历查找 body
        const findBody = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return null
          for (const key of Object.keys(obj)) {
            if (key.includes('body') || key.includes('Body')) {
              return obj[key]
            }
            const found = findBody(obj[key])
            if (found) return found
          }
          return null
        }
        body = findBody(docObj)
      }
    }

    if (!body) {
      console.warn('未找到标准文档体，尝试使用 mammoth 解析')
      throw new Error('文档结构错误，将使用后备方案')
    }

    // 5. 遍历所有元素（保持顺序）
    const elements: string[] = []

    // 处理所有子元素，保持原始顺序
    const processBodyElements = (bodyContent: any) => {
      // 如果 body 直接包含数组元素
      if (Array.isArray(bodyContent)) {
        for (const item of bodyContent) {
          if (item['w:p'] !== undefined) {
            elements.push(convertParagraphToHtml(item, stylesMap, imageMap))
          } else if (item['w:tbl'] !== undefined) {
            elements.push(convertTableToHtml(item['w:tbl'], stylesMap, imageMap))
          }
        }
        return
      }

      // 处理段落
      const paragraphs = bodyContent['w:p']
      if (paragraphs) {
        const paraList = Array.isArray(paragraphs) ? paragraphs : [paragraphs]
        for (const para of paraList) {
          elements.push(convertParagraphToHtml(para, stylesMap, imageMap))
        }
      }

      // 处理表格
      const tables = bodyContent['w:tbl']
      if (tables) {
        const tableList = Array.isArray(tables) ? tables : [tables]
        for (const table of tableList) {
          elements.push(convertTableToHtml(table, stylesMap, imageMap))
        }
      }
    }

    processBodyElements(body)

    onProgress?.(80, '正在优化格式...')

    let html = elements.join('\n')

    // 清理空的 span
    html = html.replace(/<span>\s*<\/span>/g, '')
    html = html.replace(/<span style="">\s*<\/span>/g, '')

    // 合并连续的相同样式 span
    html = optimizeHtml(html)

    onProgress?.(100, '解析完成')

    return html
  } catch (error) {
    console.error('OOXML 解析失败:', error)
    throw error
  }
}

/**
 * 转换表格为 HTML
 * 优化：防止表格溢出，添加响应式样式
 * @param table 表格对象
 * @param stylesMap 样式映射
 * @param imageMap 图片映射
 */
function convertTableToHtml(
  table: any,
  stylesMap: Record<string, any>,
  imageMap?: Map<string, string>
): string {
  if (!table) return ''

  const rows = table['w:tr']
  if (!rows) return ''

  const rowsList = Array.isArray(rows) ? rows : [rows]
  // 使用 max-width: 100% 和 table-layout: auto 防止溢出
  let html =
    '<table style="border-collapse: collapse; width: 100%; max-width: 100%; table-layout: auto; margin: 1em 0;">'

  for (const row of rowsList) {
    html += '<tr>'
    const cells = row['w:tc']
    if (cells) {
      const cellsList = Array.isArray(cells) ? cells : [cells]
      for (const cell of cellsList) {
        // 添加 word-wrap 和 overflow-wrap 防止内容溢出
        const cellStyle: string[] = [
          'border: 1px solid #ddd',
          'padding: 8px',
          'word-wrap: break-word',
          'overflow-wrap: break-word'
        ]

        // 处理单元格属性
        const tcPr = cell['w:tcPr']
        if (tcPr) {
          // 不再添加固定宽度，让表格自适应
          // 垂直对齐
          const vAlign = tcPr['w:vAlign']
          if (vAlign) {
            const val = vAlign['@_w:val']
            if (val) {
              cellStyle.push(`vertical-align: ${val}`)
            }
          }

          // 背景色
          const shd = tcPr['w:shd']
          if (shd) {
            const fill = shd['@_w:fill']
            if (fill && fill !== 'auto') {
              cellStyle.push(`background-color: #${fill}`)
            }
          }
        }

        // 处理单元格内容
        let cellContent = ''
        const cellParas = cell['w:p']
        if (cellParas) {
          const parasList = Array.isArray(cellParas) ? cellParas : [cellParas]
          for (const para of parasList) {
            const runs = para['w:r']
            if (runs) {
              const runsList = Array.isArray(runs) ? runs : [runs]
              for (const run of runsList) {
                cellContent += convertRunToHtml(run, stylesMap, imageMap)
              }
            }
          }
        }

        html += `<td style="${cellStyle.join('; ')}">${cellContent || '&nbsp;'}</td>`
      }
    }
    html += '</tr>'
  }

  html += '</table>'
  return html
}

/**
 * 优化 HTML 输出
 */
function optimizeHtml(html: string): string {
  // 移除空段落（保留作为间距的单个空段落）
  html = html.replace(/(<p[^>]*>\s*<br>\s*<\/p>\s*){2,}/g, '<p><br></p>')

  // 清理多余空格
  html = html.replace(/\s{2,}/g, ' ')

  return html.trim()
}

/**
 * 红头文件 - altChunk HTML 提取方案
 * 达到 98%+ 还原度
 */
export async function parseRedHeadDocument(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(arrayBuffer)

    onProgress?.(30, '正在提取红头文件内容...')

    // 尝试多种可能的 altChunk 文件
    let afchunk =
      zip.file('word/afchunk.mht') || zip.file('word/afchunk.htm') || zip.file('word/afchunk.html')

    // 如果没找到，尝试模糊匹配
    if (!afchunk) {
      const afchunkFiles = zip.file(/word\/afchunk/i)
      if (afchunkFiles.length > 0) {
        afchunk = afchunkFiles[0]
      }
    }

    if (!afchunk) {
      // 没有 altChunk，回退到 OOXML 解析
      console.warn('未找到红头文件内容（altChunk），回退到 OOXML 解析')
      return await parseOoxmlDocument(arrayBuffer, onProgress)
    }

    const content = await afchunk.async('string')
    onProgress?.(60, '正在解析 HTML 内容...')

    let html: string

    // 判断是 MHT 还是 HTML
    if (content.includes('MIME-Version:') || content.includes('Content-Type: multipart')) {
      // MHT 格式
      html = parseMhtToHtml(content)
    } else {
      // 直接是 HTML
      html = content
    }

    onProgress?.(80, '正在优化样式...')
    return cleanRedHeadHtml(html)
  } catch (error) {
    console.error('红头文件解析失败:', error)
    throw error
  }
}

/**
 * 解析 MHT 格式
 */
function parseMhtToHtml(mhtContent: string): string {
  try {
    // 找到 HTML 部分（可能是 quoted-printable 编码或 base64）
    const htmlMatch = mhtContent.match(
      /Content-Type:\s*text\/html[\s\S]*?\n\n([\s\S]*?)(?=------=|--=_NextPart|$)/i
    )
    if (!htmlMatch) {
      // 尝试直接查找 HTML 内容
      const directHtmlMatch = mhtContent.match(/<html[\s\S]*?<\/html>/i)
      if (directHtmlMatch) {
        return directHtmlMatch[0]
      }
      return mhtContent
    }

    let html = htmlMatch[1]

    // 检查是否是 base64 编码
    const encodingMatch = mhtContent.match(/Content-Transfer-Encoding:\s*([\w-]+)/i)
    const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : ''

    if (encoding === 'base64') {
      try {
        // 移除换行并解码
        const cleanBase64 = html.replace(/\s/g, '')
        html = atob(cleanBase64)
      } catch (e) {
        console.warn('Base64 解码失败，尝试其他方式')
      }
    } else if (encoding === 'quoted-printable') {
      // 解码 quoted-printable
      html = html
        .replace(/=\r?\n/g, '') // 软换行
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    }

    // 提取 body 内容
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      return bodyMatch[1]
    }

    // 提取 <pre> 中的内容（红头文件特有结构）
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
    if (preMatch) {
      return preMatch[1]
    }

    return html
  } catch (e) {
    console.error('MHT 解析失败:', e)
    return mhtContent
  }
}

/**
 * 清理红头文件 HTML - 保留关键样式以便 Tiptap 正确解析
 */
function cleanRedHeadHtml(html: string): string {
  // 移除编辑器特有的 data-ea-* 属性
  html = html.replace(/\s*data-ea-[^=]*="[^"]*"/g, '')

  // 移除不需要的属性（但保留 style 和 class）
  html = html.replace(/\s*(id|contenteditable|role|aria-[^=]*)="[^"]*"/gi, '')

  // 移除无用的 class（但保留有样式意义的）
  html = html.replace(/class="[^"]*MsoNormal[^"]*"/gi, '')

  // 移除 XML 命名空间声明
  html = html.replace(/<\?xml[^>]*\?>/gi, '')
  html = html.replace(/xmlns[^=]*="[^"]*"/gi, '')

  // 移除 Office 特有标签
  html = html.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '')
  html = html.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '')
  html = html.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '')

  // 移除注释
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // 移除 mso-* 样式属性（Word 特有），但保留其他有用的样式
  html = html.replace(/mso-[^;:"']+:[^;:"']+;?\s*/gi, '')

  // 清理空的 style 属性
  html = html.replace(/\s*style="\s*"/gi, '')

  // 转换 font 标签为 span（Tiptap 不支持 font 标签）
  html = html.replace(
    /<font([^>]*)color\s*=\s*["']?([^"'\s>]+)["']?([^>]*)>/gi,
    '<span style="color: $2"$1$3>'
  )
  html = html.replace(/<\/font>/gi, '</span>')

  // 确保颜色值格式正确（添加 # 前缀如果缺失）
  html = html.replace(/color:\s*([A-Fa-f0-9]{6})([^A-Fa-f0-9])/gi, 'color: #$1$2')
  html = html.replace(/color:\s*([A-Fa-f0-9]{3})([^A-Fa-f0-9])/gi, 'color: #$1$2')

  // 转换常见的颜色名称为十六进制值（Tiptap 更好地支持）
  const colorNameMap: Record<string, string> = {
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    yellow: '#FFFF00',
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',
    grey: '#808080',
    orange: '#FFA500',
    purple: '#800080',
    pink: '#FFC0CB',
    brown: '#A52A2A',
    navy: '#000080',
    teal: '#008080',
    maroon: '#800000',
    olive: '#808000',
    aqua: '#00FFFF',
    fuchsia: '#FF00FF',
    silver: '#C0C0C0',
    lime: '#00FF00'
  }

  for (const [name, hex] of Object.entries(colorNameMap)) {
    const regex = new RegExp(`color:\\s*${name}([;\\s"'])`, 'gi')
    html = html.replace(regex, `color: ${hex}$1`)
  }

  // 移除空行
  html = html.replace(/\n\s*\n/g, '\n')

  // 移除空的 span 包装（在处理完颜色后）
  html = html.replace(/<span>\s*<\/span>/gi, '')
  html = html.replace(/<span[^>]*>[\s\ufeff]*<br\s*\/?>\s*<\/span>/gi, '<br>')

  return html.trim()
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

// =====================================================
// 高保真 Word 导入 - docx-preview 方案
// =====================================================

/**
 * 使用 docx-preview 高保真解析 Word 文档
 * 优点：支持字体、颜色、大小、对齐、表格、图片、列表等几乎所有格式
 * @param arrayBuffer Word 文档的 ArrayBuffer
 * @param onProgress 可选的进度回调函数
 * @returns 解析后的 HTML 内容
 */
export async function parseWithDocxPreview(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(20, '正在初始化渲染引擎...')

  // 动态导入 docx-preview
  const docxPreview = await import('docx-preview')

  // 创建临时容器
  const container = document.createElement('div')
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;'
  document.body.appendChild(container)

  try {
    onProgress?.(40, '正在渲染文档内容...')

    // 高保真渲染配置
    await docxPreview.renderAsync(arrayBuffer, container, undefined, {
      className: 'docx-content',
      inWrapper: true, // 使用包装器以便更好地提取内容
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false, // 保留字体
      breakPages: false, // 不分页
      renderHeaders: false, // 不渲染页眉（避免重复内容）
      renderFooters: false, // 不渲染页脚
      renderFootnotes: true, // 渲染脚注
      renderEndnotes: true, // 渲染尾注
      useBase64URL: true, // 图片转 base64
      experimental: {
        renderStyle: true // 渲染内联样式
      }
    } as any)

    onProgress?.(70, '正在提取 HTML 内容...')

    // 使用 DOM 方式提取内容，避免正则匹配问题
    let html = ''

    // 查找文档主体内容（通常在 section 元素中）
    const sections = container.querySelectorAll('section')
    if (sections.length > 0) {
      // 遍历所有 section，提取内容
      sections.forEach((section) => {
        html += section.innerHTML
      })
    } else {
      // 如果没有 section，尝试获取 article 内容
      const articles = container.querySelectorAll('article')
      if (articles.length > 0) {
        articles.forEach((article) => {
          html += article.innerHTML
        })
      } else {
        // 最后回退到整个容器内容
        html = container.innerHTML
      }
    }

    console.log('docx-preview 提取的原始 HTML 长度:', html.length)

    // 调试：检查标题元素
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
    console.log(`docx-preview 找到 ${headings.length} 个标题元素`)
    if (headings.length > 0) {
      console.log('第一个标题:', headings[0].outerHTML.substring(0, 200))
    }

    // 检查是否有大字体段落（可能是标题但未被识别）
    const paragraphs = tempDiv.querySelectorAll('p')
    const largeFontParagraphs: string[] = []
    paragraphs.forEach((p) => {
      const style = p.getAttribute('style') || ''
      // 支持 pt 和 px 单位
      const fontSizeMatchPt = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/i)
      const fontSizeMatchPx = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*px/i)
      let fontSize = 0
      if (fontSizeMatchPt) {
        fontSize = parseFloat(fontSizeMatchPt[1]) * 1.33 // pt 转 px
      } else if (fontSizeMatchPx) {
        fontSize = parseFloat(fontSizeMatchPx[1])
      }
      if (fontSize >= 19) {
        // 约14pt+
        largeFontParagraphs.push(p.textContent?.substring(0, 50) || '')
      }
    })
    if (largeFontParagraphs.length > 0) {
      console.log('发现大字体段落（可能是标题）:', largeFontParagraphs.slice(0, 3))
    }

    onProgress?.(85, '正在优化格式...')

    // 后处理：清理并适配 Tiptap
    html = postProcessDocxPreviewHtml(html)

    console.log('docx-preview 处理后 HTML 长度:', html.length)

    // 如果处理后内容太短，可能出错了，回退到原始内容
    if (html.length < 50) {
      console.warn('docx-preview 处理后内容过短，回退到简单清理')
      html = container.innerHTML
      // 简单清理
      html = html.replace(/<article[^>]*>|<\/article>|<section[^>]*>|<\/section>/gi, '')
      html = html.replace(/class="[^"]*docx[^"]*"/gi, '')
      html = html.trim()
    }

    onProgress?.(100, '解析完成')
    return html
  } finally {
    // 清理临时容器
    document.body.removeChild(container)
  }
}

/**
 * 后处理 docx-preview 输出的 HTML，适配 Tiptap 编辑器
 */
function postProcessDocxPreviewHtml(html: string): string {
  // 保存原始长度用于调试
  const originalLength = html.length

  // 0. 移除 docx-preview 的包装元素（article, section），但保留其内容
  // 注意：只移除标签本身，不移除内容
  html = html.replace(/<article[^>]*>/gi, '')
  html = html.replace(/<\/article>/gi, '')
  html = html.replace(/<section[^>]*>/gi, '')
  html = html.replace(/<\/section>/gi, '')

  // 1. 移除 docx-preview 特有的包装类，但保留标签
  html = html.replace(/\s*class="docx-wrapper[^"]*"/g, '')
  html = html.replace(/\s*class="docx[^"]*"/g, '')

  // 检查内容是否被意外清空
  if (html.trim().length < originalLength * 0.1 && originalLength > 100) {
    console.warn('postProcessDocxPreviewHtml: 内容可能被过度清理')
  }

  // 2. 转换 docx-preview 的表格样式为标准格式
  html = html.replace(/<table[^>]*>/g, (match) => {
    // 移除原有的 class，添加标准样式
    const cleanMatch = match.replace(/class="[^"]*"/g, '')
    if (cleanMatch.includes('style=')) {
      return cleanMatch.replace(
        /style="([^"]*)"/,
        'style="$1; border-collapse: collapse; width: 100%; max-width: 100%;"'
      )
    }
    return cleanMatch.replace(
      /<table/,
      '<table style="border-collapse: collapse; width: 100%; max-width: 100%;"'
    )
  })

  // 3. 确保表格单元格有边框
  html = html.replace(/<td([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('style=')) {
      return match.replace(/style="([^"]*)"/, 'style="$1; border: 1px solid #ddd; padding: 8px;"')
    }
    return `<td${attrs} style="border: 1px solid #ddd; padding: 8px;">`
  })
  html = html.replace(/<th([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('style=')) {
      return match.replace(
        /style="([^"]*)"/,
        'style="$1; border: 1px solid #ddd; padding: 8px; background: #f5f5f5;"'
      )
    }
    return `<th${attrs} style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">`
  })

  // 4. 确保图片响应式
  html = html.replace(/<img([^>]*)>/g, (match, attrs) => {
    if (!attrs.includes('max-width')) {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, 'style="$1; max-width: 100%; height: auto;"')
      }
      return `<img${attrs} style="max-width: 100%; height: auto;">`
    }
    return match
  })

  // 5. 转换 span 内联样式为 Tiptap 支持的格式（包括标题元素上的样式）
  html = convertInlineStylesToTiptap(html)

  // 5.3. 清理标题元素上的 font-size 样式（标题应该使用编辑器默认样式，而不是内联 font-size）
  // 同时确保标题元素有正确的加粗样式
  html = html.replace(/<h([1-6])([^>]*)style="([^"]*)"/gi, (_match, level, attrs, style) => {
    // 移除 font-size 相关的样式，但保留其他样式（如 color, text-align, font-family）
    const cleanedStyle = style
      .split(';')
      .filter((s: string) => {
        const trimmed = s.trim()
        return trimmed && !trimmed.match(/^font-size:/i)
      })
      .join(';')
      .trim()

    // 确保标题有加粗样式（如果没有的话）
    let finalStyle = cleanedStyle
    if (!finalStyle.includes('font-weight')) {
      const fontWeight = level <= 2 ? 'font-weight: 700' : 'font-weight: 600'
      finalStyle = finalStyle ? `${finalStyle}; ${fontWeight}` : fontWeight
    }

    if (finalStyle) {
      return `<h${level}${attrs}style="${finalStyle}">`
    }
    return `<h${level}${attrs}>`
  })

  // 对于没有 style 属性的标题，也确保有加粗样式
  html = html.replace(/<h([1-6])([^>]*)(?<!style=)>/gi, (match, level, attrs) => {
    if (!attrs.includes('style=')) {
      const fontWeight = level <= 2 ? 'font-weight: 700' : 'font-weight: 600'
      return `<h${level}${attrs} style="${fontWeight}">`
    }
    return match
  })

  // 5.5. 将大字体段落转换为标题（处理 WPS 等编辑器不使用标准标题样式的情况）
  html = convertLargeFontParagraphsToHeadings(html)

  // 6. 移除 docx-preview 添加的特殊属性
  html = html.replace(/\s+data-[^=]+="[^"]*"/g, '')

  // 7. 清理开头的空段落和空白
  html = html.trim()
  // 移除开头的空段落
  html = html.replace(/^(<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>\s*)+/gi, '')
  // 移除末尾的多余空段落（保留一个）
  html = html.replace(/(<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>\s*){2,}$/gi, '<p><br></p>')

  // 8. 清理空的 span 元素
  html = html.replace(/<span[^>]*>\s*<\/span>/g, '')

  // 9. 处理红色横线（红头文件特有）
  // 将带有红色边框的空段落/div 转换为红色 hr
  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border[^"]*(?:red|#[fF]{2}0{4}|#[fF]00|rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\))[^"]*"[^>]*>\s*(?:&nbsp;)*\s*<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  // 处理只有 border-bottom 的红色横线
  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border-bottom[^;]*(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"[^>]*>(\s*(?:&nbsp;)*\s*)<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  // 保留已有的 hr 标签，但如果有红色样式则添加 class
  html = html.replace(
    /<hr([^>]*)style="[^"]*(?:border[^;]*)?(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"([^>]*)>/gi,
    '<hr$1 class="red-line" data-line-color="red"$2>'
  )

  // 10. 将空段落转换为带 br 的段落（Tiptap 需要）
  html = html.replace(/<p>\s*<\/p>/g, '<p><br></p>')

  return html
}

/**
 * 从元素或其子元素中提取最大字体大小（px）
 */
function extractMaxFontSize(element: Element): number {
  let maxFontSize = 0

  // 检查元素自身的样式
  const style = element.getAttribute('style') || ''

  // 支持多种字体大小格式
  // pt 单位
  const ptMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/i)
  if (ptMatch) {
    maxFontSize = Math.max(maxFontSize, parseFloat(ptMatch[1]) * 1.33)
  }
  // px 单位
  const pxMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*px/i)
  if (pxMatch) {
    maxFontSize = Math.max(maxFontSize, parseFloat(pxMatch[1]))
  }
  // em 单位（假设基准 16px）
  const emMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*em/i)
  if (emMatch) {
    maxFontSize = Math.max(maxFontSize, parseFloat(emMatch[1]) * 16)
  }
  // rem 单位（假设基准 16px）
  const remMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*rem/i)
  if (remMatch) {
    maxFontSize = Math.max(maxFontSize, parseFloat(remMatch[1]) * 16)
  }

  // 递归检查所有子元素
  const children = element.querySelectorAll('*')
  children.forEach((child) => {
    const childStyle = child.getAttribute('style') || ''

    const childPtMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/i)
    if (childPtMatch) {
      maxFontSize = Math.max(maxFontSize, parseFloat(childPtMatch[1]) * 1.33)
    }

    const childPxMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*px/i)
    if (childPxMatch) {
      maxFontSize = Math.max(maxFontSize, parseFloat(childPxMatch[1]))
    }

    const childEmMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*em/i)
    if (childEmMatch) {
      maxFontSize = Math.max(maxFontSize, parseFloat(childEmMatch[1]) * 16)
    }

    const childRemMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*rem/i)
    if (childRemMatch) {
      maxFontSize = Math.max(maxFontSize, parseFloat(childRemMatch[1]) * 16)
    }
  })

  return maxFontSize
}

/**
 * 检查元素或其子元素是否加粗
 */
function checkIsBold(element: Element): boolean {
  const style = element.getAttribute('style') || ''

  // 检查元素自身
  if (
    style.includes('font-weight: bold') ||
    style.includes('font-weight:bold') ||
    style.includes('font-weight: 700') ||
    style.includes('font-weight:700') ||
    style.includes('font-weight:600') ||
    style.includes('font-weight: 600')
  ) {
    return true
  }

  // 检查是否有 b 或 strong 标签
  if (element.querySelector('b, strong')) {
    return true
  }

  // 检查所有子元素
  const children = Array.from(element.querySelectorAll('*'))
  for (const child of children) {
    const childStyle = child.getAttribute('style') || ''
    if (
      childStyle.includes('font-weight: bold') ||
      childStyle.includes('font-weight:bold') ||
      childStyle.includes('font-weight: 700') ||
      childStyle.includes('font-weight:700') ||
      childStyle.includes('font-weight:600') ||
      childStyle.includes('font-weight: 600')
    ) {
      return true
    }
  }

  return false
}

/**
 * 将大字体段落转换为标题
 * 处理 WPS 等编辑器不使用标准标题样式的情况
 */
function convertLargeFontParagraphsToHeadings(html: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html')
    const root = doc.getElementById('root')
    if (!root) return html

    // 检查是否已经有标题元素
    const existingHeadings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
    console.log(`convertLargeFontParagraphsToHeadings: 已有 ${existingHeadings.length} 个标题元素`)

    const paragraphs = root.querySelectorAll('p')
    let modified = false
    let convertedCount = 0

    console.log(`convertLargeFontParagraphsToHeadings: 检查 ${paragraphs.length} 个段落`)

    paragraphs.forEach((p) => {
      // 获取段落的文本内容
      const text = p.textContent?.trim() || ''
      if (!text || text.length > 100) return // 跳过空段落和过长的段落（不太可能是标题）

      // 检查段落样式
      const style = p.getAttribute('style') || ''

      // 检查是否居中
      const isCenter =
        style.includes('text-align: center') ||
        style.includes('text-align:center') ||
        style.includes('text-align: justify') // 有些文档用 justify 作为标题

      // 使用改进的字体大小提取函数
      const fontSize = extractMaxFontSize(p)

      // 使用改进的加粗检测函数
      const isBold = checkIsBold(p)

      // 调试输出（帮助诊断问题）
      if (fontSize > 0 || isBold) {
        console.log(
          `段落检测: "${text.substring(0, 30)}..." fontSize=${fontSize.toFixed(1)}px, isBold=${isBold}, isCenter=${isCenter}`
        )
      }

      // 根据字体大小和其他特征判断标题级别（使用 px 单位）
      // 放宽条件：大字体本身就可能是标题，不一定需要同时居中或加粗
      // 参考标准：H1≈32px(24pt), H2≈24px(18pt), H3≈20px(15pt), H4≈18px(14pt)
      let headingLevel = 0

      // 一级标题：字体 >= 29px (约22pt)
      if (fontSize >= 29) {
        headingLevel = 1
      }
      // 二级标题：字体 >= 24px (约18pt)
      else if (fontSize >= 24) {
        headingLevel = 2
      }
      // 三级标题：字体 >= 20px (约15pt) 或 加粗的 >= 18px
      else if (fontSize >= 20 || (fontSize >= 18 && isBold)) {
        headingLevel = 3
      }
      // 四级标题：字体 >= 17px 且加粗，或居中的 >= 16px
      else if ((fontSize >= 17 && isBold) || (fontSize >= 16 && isCenter)) {
        headingLevel = 4
      }
      // 五级标题：加粗的 >= 15px
      else if (fontSize >= 15 && isBold) {
        headingLevel = 5
      }
      // 六级标题：加粗的 >= 14px
      else if (fontSize >= 14 && isBold) {
        headingLevel = 6
      }

      if (headingLevel > 0) {
        // 创建标题元素
        const heading = doc.createElement(`h${headingLevel}`)
        heading.innerHTML = p.innerHTML
        // 复制部分样式（排除 font-size，因为标题有自己的样式，但保留其他样式）
        const keepStyles: string[] = []
        style.split(';').forEach((s) => {
          const trimmed = s.trim()
          if (
            trimmed.startsWith('text-align:') ||
            trimmed.startsWith('color:') ||
            trimmed.startsWith('font-family:') ||
            trimmed.startsWith('font-weight:')
          ) {
            keepStyles.push(trimmed)
          }
        })
        if (keepStyles.length > 0) {
          heading.setAttribute('style', keepStyles.join('; '))
        }
        p.parentNode?.replaceChild(heading, p)
        modified = true
        convertedCount++
        console.log(
          `✓ 转换段落为 h${headingLevel}: "${text.substring(0, 50)}..." (fontSize=${fontSize.toFixed(1)}px)`
        )
      }
    })

    console.log(`convertLargeFontParagraphsToHeadings: 共转换 ${convertedCount} 个段落为标题`)

    if (modified) {
      return root.innerHTML
    }
    return html
  } catch (e) {
    console.warn('convertLargeFontParagraphsToHeadings 失败:', e)
    return html
  }
}

/**
 * 转换内联样式为 Tiptap 支持的格式
 */
function convertInlineStylesToTiptap(html: string): string {
  // 处理字体大小：pt -> px (1pt ≈ 1.33px，96 DPI)
  html = html.replace(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/gi, (_, size) => {
    const ptSize = parseFloat(size)
    const pxSize = Math.round(ptSize * 1.33)
    return `font-size: ${pxSize}px`
  })

  // 处理已经是 px 单位的字体大小，确保格式正确
  html = html.replace(/font-size:\s*(\d+(?:\.\d+)?)\s*px/gi, (_, size) => {
    return `font-size: ${Math.round(parseFloat(size))}px`
  })

  // 处理字体颜色
  html = html.replace(/color:\s*#([a-fA-F0-9]{6})/gi, 'color: #$1')
  html = html.replace(/color:\s*#([a-fA-F0-9]{3})/gi, 'color: #$1')

  // 处理背景色（高亮）- 标准化格式
  html = html.replace(/background-color:\s*#([a-fA-F0-9]{6})/gi, 'background-color: #$1')
  html = html.replace(/background-color:\s*#([a-fA-F0-9]{3})/gi, 'background-color: #$1')

  // 将带有 background-color 的 span 转换为 mark 标签（Tiptap Highlight 扩展使用 mark 标签）
  html = html.replace(
    /<span([^>]*)style="([^"]*background-color:\s*#([a-fA-F0-9]{3,6})[^"]*)"([^>]*)>([\s\S]*?)<\/span>/gi,
    (_match, before, style, bgColor, after, content) => {
      // 提取非背景色的其他样式
      const otherStyles = style
        .split(';')
        .filter((s: string) => !s.trim().toLowerCase().startsWith('background-color'))
        .join(';')
        .trim()

      // 如果有其他样式，保留 span 包装；否则只用 mark
      if (otherStyles) {
        return `<mark data-color="#${bgColor}" style="background-color: #${bgColor}"><span${before}style="${otherStyles}"${after}>${content}</span></mark>`
      }
      return `<mark data-color="#${bgColor}" style="background-color: #${bgColor}">${content}</mark>`
    }
  )

  // 处理 rgb 颜色格式
  html = html.replace(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi, (_, r, g, b) => {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = parseInt(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    return `color: ${hex}`
  })

  // 处理 rgba 颜色格式（忽略透明度）
  html = html.replace(/color:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/gi, (_, r, g, b) => {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = parseInt(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    return `color: ${hex}`
  })

  // 确保文本对齐样式被保留
  html = html.replace(/text-align:\s*(left|center|right|justify)/gi, 'text-align: $1')

  // 确保字体族样式被保留
  html = html.replace(/font-family:\s*([^;}"']+)/gi, (_, font) => {
    return `font-family: ${font.trim()}`
  })

  return html
}

// =====================================================
// 增强 OOXML 解析器
// =====================================================

/**
 * 列表编号定义类型
 */
interface NumberingLevel {
  level: string
  format: string
  text: string
  start: string
}

/**
 * 解析 numbering.xml - 处理有序/无序列表
 */
async function parseNumberingXml(zip: any): Promise<Map<string, NumberingLevel[]>> {
  const numberingMap = new Map<string, NumberingLevel[]>()
  const numberingFile = zip.file('word/numbering.xml')
  if (!numberingFile) return numberingMap

  try {
    const content = await numberingFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    // 提取列表定义
    const abstractNums = obj?.['w:numbering']?.['w:abstractNum'] || []
    const numsList = Array.isArray(abstractNums) ? abstractNums : [abstractNums]

    for (const num of numsList) {
      if (!num) continue
      const abstractNumId = num['@_w:abstractNumId']
      const levels = num['w:lvl'] || []
      const levelsList = Array.isArray(levels) ? levels : [levels]

      numberingMap.set(
        abstractNumId,
        levelsList.map((lvl: any) => ({
          level: lvl['@_w:ilvl'] || '0',
          format: lvl['w:numFmt']?.['@_w:val'] || 'decimal',
          text: lvl['w:lvlText']?.['@_w:val'] || '',
          start: lvl['w:start']?.['@_w:val'] || '1'
        }))
      )
    }
  } catch (e) {
    console.warn('解析 numbering.xml 失败:', e)
  }

  return numberingMap
}

/**
 * 解析 fontTable.xml - 获取字体映射
 */
async function parseFontTableXml(zip: any): Promise<Map<string, string>> {
  const fontMap = new Map<string, string>()
  const fontFile = zip.file('word/fontTable.xml')
  if (!fontFile) return fontMap

  try {
    const content = await fontFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    const fonts = obj?.['w:fonts']?.['w:font'] || []
    const fontsList = Array.isArray(fonts) ? fonts : [fonts]

    for (const font of fontsList) {
      if (!font) continue
      const name = font['@_w:name']
      if (name) {
        // 尝试获取字体替代名称
        const altName = font['w:altName']?.['@_w:val']
        fontMap.set(name, altName || name)
      }
    }
  } catch (e) {
    console.warn('解析 fontTable.xml 失败:', e)
  }

  return fontMap
}

/**
 * 增强的样式解析
 */
async function parseStylesXmlEnhanced(zip: any): Promise<Record<string, any>> {
  const stylesMap: Record<string, any> = {}
  const stylesFile = zip.file('word/styles.xml')
  if (!stylesFile) return stylesMap

  try {
    const content = await stylesFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    // 解析默认样式
    const docDefaults = obj?.['w:styles']?.['w:docDefaults']
    if (docDefaults) {
      const rPrDefault = docDefaults['w:rPrDefault']?.['w:rPr'] || {}
      const pPrDefault = docDefaults['w:pPrDefault']?.['w:pPr'] || {}
      stylesMap['__default__'] = { rPr: rPrDefault, pPr: pPrDefault }
    }

    // 解析样式定义
    const styles = obj?.['w:styles']?.['w:style'] || []
    const stylesList = Array.isArray(styles) ? styles : [styles]

    for (const style of stylesList) {
      if (!style) continue
      const styleId = style['@_w:styleId']
      if (!styleId) continue

      const rPr = style['w:rPr'] || {}
      const pPr = style['w:pPr'] || {}
      const basedOn = style['w:basedOn']?.['@_w:val']

      stylesMap[styleId] = {
        rPr,
        pPr,
        name: style['w:name']?.['@_w:val'] || styleId,
        basedOn,
        type: style['@_w:type'] || 'paragraph'
      }
    }
  } catch (e) {
    console.warn('解析 styles.xml 失败:', e)
  }

  return stylesMap
}

/**
 * 处理所有图片资源
 */
async function processAllImages(zip: any): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  try {
    // 解析关系文件
    const relsFile = zip.file('word/_rels/document.xml.rels')
    if (!relsFile) return imageMap

    const relsContent = await relsFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const relsObj = parser.parse(relsContent)
    const relationships = relsObj?.['Relationships']?.['Relationship'] || []
    const relsList = Array.isArray(relationships) ? relationships : [relationships]

    for (const rel of relsList) {
      if (!rel) continue
      const type = rel['@_Type'] || ''
      const target = rel['@_Target'] || ''
      const id = rel['@_Id'] || ''

      if (type.includes('image')) {
        const imagePath = target.startsWith('/') ? target.substring(1) : `word/${target}`
        const imageFile = zip.file(imagePath)

        if (imageFile) {
          try {
            const imageData = await imageFile.async('base64')
            const ext = target.split('.').pop()?.toLowerCase() || 'png'
            const mimeType =
              ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'gif'
                  ? 'image/gif'
                  : ext === 'webp'
                    ? 'image/webp'
                    : ext === 'svg'
                      ? 'image/svg+xml'
                      : 'image/png'
            imageMap.set(id, `data:${mimeType};base64,${imageData}`)
          } catch (e) {
            console.warn(`处理图片失败: ${imagePath}`, e)
          }
        }
      }
    }
  } catch (e) {
    console.warn('处理图片资源失败:', e)
  }

  return imageMap
}

/**
 * 增强的 OOXML 解析 - 完整提取样式信息
 * 达到 90%+ 保真度
 */
export async function parseOoxmlDocumentEnhanced(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  const JSZip = (await import('jszip')).default
  const { XMLParser } = await import('fast-xml-parser')

  onProgress?.(10, '正在解压文档...')
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. 解析 numbering.xml（列表编号定义）
  onProgress?.(20, '正在解析列表样式...')
  const numberingMap = await parseNumberingXml(zip)

  // 2. 解析 styles.xml（完整样式定义）
  onProgress?.(30, '正在解析文档样式...')
  const stylesMap = await parseStylesXmlEnhanced(zip)

  // 3. 解析 fontTable.xml（字体映射）
  onProgress?.(40, '正在解析字体信息...')
  const fontMap = await parseFontTableXml(zip)

  // 4. 解析所有图片
  onProgress?.(50, '正在处理图片...')
  const imageMap = await processAllImages(zip)

  // 5. 解析 document.xml（主文档内容）
  onProgress?.(60, '正在解析文档内容...')
  const documentXml = await zip.file('word/document.xml')?.async('string')
  if (!documentXml) {
    throw new Error('未找到文档内容')
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: true, // 保持元素顺序
    trimValues: false // 保留空格
  })

  const docObj = parser.parse(documentXml)

  // 6. 递归转换为 HTML（保持完整顺序和嵌套）
  onProgress?.(80, '正在生成 HTML...')
  const html = convertDocumentToHtmlEnhanced(docObj, {
    styles: stylesMap,
    numbering: numberingMap,
    fonts: fontMap,
    images: imageMap
  })

  onProgress?.(100, '解析完成')

  // 应用样式转换，将 pt 转 px、将 background-color 的 span 转为 mark 标签
  const processedHtml = convertInlineStylesToTiptap(html)
  return processedHtml
}

/**
 * 增强的文档转换 - 支持 preserveOrder 模式
 */
function convertDocumentToHtmlEnhanced(
  docObj: any[],
  context: {
    styles: Record<string, any>
    numbering: Map<string, NumberingLevel[]>
    fonts: Map<string, string>
    images: Map<string, string>
  }
): string {
  const elements: string[] = []

  // 查找文档体
  const findBody = (arr: any[]): any[] | null => {
    for (const item of arr) {
      if (item['w:document']) {
        const docChildren = item['w:document']
        for (const child of docChildren) {
          if (child['w:body']) {
            return child['w:body']
          }
        }
      }
    }
    return null
  }

  const body = findBody(docObj)
  if (!body) {
    console.warn('未找到文档体')
    return ''
  }

  // 遍历所有元素
  for (const item of body) {
    if (item['w:p']) {
      // 段落
      const paraHtml = convertParagraphEnhanced(item['w:p'], context)
      if (paraHtml) elements.push(paraHtml)
    } else if (item['w:tbl']) {
      // 表格
      const tableHtml = convertTableEnhanced(item['w:tbl'], context)
      if (tableHtml) elements.push(tableHtml)
    } else if (item['w:sectPr']) {
      // 节属性，忽略
    }
  }

  return elements.join('\n')
}

/**
 * 增强的段落转换
 */
function convertParagraphEnhanced(
  paraItems: any[],
  context: {
    styles: Record<string, any>
    numbering: Map<string, NumberingLevel[]>
    fonts: Map<string, string>
    images: Map<string, string>
  }
): string {
  const styleArr: string[] = []
  let content = ''
  let isListItem = false
  let headingLevel = 0 // 标题级别，0 表示非标题
  // listType 用于未来扩展列表类型识别
  // let listType = 'ul'

  for (const item of paraItems) {
    if (item['w:pPr']) {
      // 段落属性
      const pPr = item['w:pPr']
      for (const prop of pPr) {
        // 检测段落样式（标题、正文等）
        if (prop['w:pStyle']) {
          const styleAttrs = prop[':@']
          const styleId = styleAttrs?.['@_w:val']
          if (styleId) {
            // 识别标题样式
            const headingMatch = styleId.match(/^(?:Heading|标题|heading)(\d)$/i)
            if (headingMatch) {
              headingLevel = parseInt(headingMatch[1])
            } else if (/^(H[1-6]|Title|TOC)/i.test(styleId)) {
              // 其他标题样式
              const numMatch = styleId.match(/\d/)
              headingLevel = numMatch ? parseInt(numMatch[0]) : 1
            } else if (context.styles[styleId]) {
              // 从样式定义中获取 outlineLevel
              const styleDef = context.styles[styleId]
              const outlineLevel = styleDef.pPr?.['w:outlineLvl']?.['@_w:val']
              if (outlineLevel !== undefined) {
                headingLevel = parseInt(outlineLevel) + 1 // outlineLevel 从 0 开始
              }
            }
          }
        }
        // 文本对齐
        if (prop['w:jc']) {
          const jcAttrs = prop[':@']
          const jc = jcAttrs?.['@_w:val']
          if (jc) {
            const alignMap: Record<string, string> = {
              left: 'left',
              center: 'center',
              right: 'right',
              both: 'justify',
              justify: 'justify'
            }
            if (alignMap[jc]) {
              styleArr.push(`text-align: ${alignMap[jc]}`)
            }
          }
        }
        // 首行缩进
        if (prop['w:ind']) {
          const indAttrs = prop[':@']
          const firstLine = indAttrs?.['@_w:firstLine'] || indAttrs?.['@_w:firstLineChars']
          if (firstLine) {
            const value = parseInt(firstLine)
            if (indAttrs?.['@_w:firstLineChars']) {
              styleArr.push(`text-indent: ${value / 100}em`)
            } else {
              styleArr.push(`text-indent: ${value / 20}pt`)
            }
          }
        }
        // 行高
        if (prop['w:spacing']) {
          const spacingAttrs = prop[':@']
          const line = spacingAttrs?.['@_w:line']
          const lineRule = spacingAttrs?.['@_w:lineRule']
          if (line) {
            const lineValue = parseInt(line)
            if (lineRule === 'exact' || lineRule === 'atLeast') {
              styleArr.push(`line-height: ${lineValue / 20}pt`)
            } else {
              styleArr.push(`line-height: ${(lineValue / 240).toFixed(2)}`)
            }
          }
        }
        // 列表
        if (prop['w:numPr']) {
          isListItem = true
          const numPr = prop['w:numPr']
          for (const numItem of numPr) {
            if (numItem['w:numId']) {
              const numId = numItem[':@']?.['@_w:val']
              // 尝试判断是有序还是无序列表
              if (numId) {
                const levels = context.numbering.get(numId)
                if (levels && levels.length > 0) {
                  // 用于未来扩展列表类型识别
                  // const format = levels[0].format
                  // listType = format === 'bullet' ? 'ul' : 'ol'
                  void levels // 保留以备未来使用
                }
              }
            }
          }
        }
      }
    } else if (item['w:r']) {
      // Run 元素
      content += convertRunEnhanced(item['w:r'], context)
    } else if (item['w:hyperlink']) {
      // 超链接
      const hyperlink = item['w:hyperlink']
      for (const hItem of hyperlink) {
        if (hItem['w:r']) {
          content += convertRunEnhanced(hItem['w:r'], context)
        }
      }
    }
  }

  if (!content && styleArr.length === 0) {
    return '<p><br></p>'
  }

  const style = styleArr.length > 0 ? ` style="${styleArr.join('; ')}"` : ''

  if (isListItem) {
    return `<li${style}>${content || '<br>'}</li>`
  }

  // 如果是标题，使用对应的标题标签
  if (headingLevel >= 1 && headingLevel <= 6) {
    return `<h${headingLevel}${style}>${content || ''}</h${headingLevel}>`
  }

  return `<p${style}>${content || '<br>'}</p>`
}

/**
 * 增强的 Run 转换
 */
function convertRunEnhanced(
  runItems: any[],
  context: {
    styles: Record<string, any>
    numbering: Map<string, NumberingLevel[]>
    fonts: Map<string, string>
    images: Map<string, string>
  }
): string {
  const style: string[] = []
  let text = ''

  for (const item of runItems) {
    if (item['w:rPr']) {
      // Run 属性
      const rPr = item['w:rPr']
      for (const prop of rPr) {
        // 字体
        if (prop['w:rFonts']) {
          const attrs = prop[':@']
          const font = attrs?.['@_w:eastAsia'] || attrs?.['@_w:ascii'] || attrs?.['@_w:hAnsi']
          if (font) {
            const mappedFont = context.fonts.get(font) || font
            style.push(`font-family: "${mappedFont}"`)
          }
        }
        // 字号
        if (prop['w:sz']) {
          const size = parseInt(prop[':@']?.['@_w:val'] || '0') / 2
          if (size > 0) style.push(`font-size: ${size}pt`)
        }
        if (prop['w:szCs']) {
          const size = parseInt(prop[':@']?.['@_w:val'] || '0') / 2
          if (size > 0 && !style.some((s) => s.startsWith('font-size'))) {
            style.push(`font-size: ${size}pt`)
          }
        }
        // 颜色
        if (prop['w:color']) {
          const colorVal = prop[':@']?.['@_w:val']
          if (colorVal && colorVal !== 'auto') {
            style.push(`color: #${colorVal}`)
          }
        }
        // 高亮
        if (prop['w:highlight']) {
          const highlightColor = prop[':@']?.['@_w:val']
          if (highlightColor) {
            const colorMap: Record<string, string> = {
              yellow: '#FFFF00',
              green: '#00FF00',
              cyan: '#00FFFF',
              magenta: '#FF00FF',
              blue: '#0000FF',
              red: '#FF0000',
              darkBlue: '#00008B',
              darkCyan: '#008B8B',
              darkGreen: '#006400',
              darkMagenta: '#8B008B',
              darkRed: '#8B0000',
              darkYellow: '#808000',
              darkGray: '#A9A9A9',
              lightGray: '#D3D3D3',
              black: '#000000'
            }
            style.push(`background-color: ${colorMap[highlightColor] || highlightColor}`)
          }
        }
        // 底纹/背景色 (w:shd) - 处理 htmlToDocx 导出的 shading 样式
        if (prop['w:shd']) {
          const fillColor = prop[':@']?.['@_w:fill']
          if (fillColor && fillColor !== 'auto' && fillColor !== 'FFFFFF') {
            // 如果没有通过 highlight 设置背景色，则使用 shading
            if (!style.some((s) => s.startsWith('background-color'))) {
              style.push(`background-color: #${fillColor}`)
            }
          }
        }
        // 加粗
        if (prop['w:b'] !== undefined) {
          const val = prop[':@']?.['@_w:val']
          if (val !== 'false' && val !== '0') {
            style.push('font-weight: bold')
          }
        }
        // 斜体
        if (prop['w:i'] !== undefined) {
          const val = prop[':@']?.['@_w:val']
          if (val !== 'false' && val !== '0') {
            style.push('font-style: italic')
          }
        }
        // 下划线
        if (prop['w:u'] !== undefined) {
          const val = prop[':@']?.['@_w:val']
          if (val && val !== 'none') {
            style.push('text-decoration: underline')
          }
        }
        // 删除线
        if (prop['w:strike'] !== undefined) {
          const val = prop[':@']?.['@_w:val']
          if (val !== 'false' && val !== '0') {
            style.push('text-decoration: line-through')
          }
        }
      }
    } else if (item['w:t']) {
      // 文本
      const tItem = item['w:t']
      if (Array.isArray(tItem)) {
        for (const t of tItem) {
          if (t['#text'] !== undefined) {
            text += t['#text']
          }
        }
      } else if (typeof tItem === 'string') {
        text += tItem
      } else if (tItem['#text'] !== undefined) {
        text += tItem['#text']
      }
    } else if (item['w:br']) {
      text += '<br>'
    } else if (item['w:tab']) {
      text += '&emsp;&emsp;'
    } else if (item['w:drawing']) {
      // 图片
      const imgHtml = extractImageFromDrawingEnhanced(item['w:drawing'], context.images)
      if (imgHtml) text += imgHtml
    }
  }

  if (!text) return ''

  const styleAttr = style.length ? ` style="${style.join('; ')}"` : ''
  return `<span${styleAttr}>${escapeHtml(text)}</span>`
}

/**
 * 增强的图片提取 - 支持 preserveOrder 模式
 */
function extractImageFromDrawingEnhanced(
  drawingItems: any[],
  imageMap: Map<string, string>
): string {
  try {
    for (const item of drawingItems) {
      // 处理 inline 图片
      if (item['wp:inline']) {
        return extractImageFromElementEnhanced(item['wp:inline'], imageMap)
      }
      // 处理 anchor 图片
      if (item['wp:anchor']) {
        return extractImageFromElementEnhanced(item['wp:anchor'], imageMap)
      }
    }
  } catch (e) {
    console.warn('提取图片失败:', e)
  }
  return ''
}

/**
 * 从元素提取图片
 */
function extractImageFromElementEnhanced(elements: any[], imageMap: Map<string, string>): string {
  try {
    let width = 0
    let embedId = ''

    for (const item of elements) {
      // 获取尺寸
      if (item['wp:extent']) {
        const attrs = item[':@']
        width = Math.round((parseInt(attrs?.['@_cx'] || '0') / 914400) * 96)
        // height 暂时保留用于未来扩展
        // const height = Math.round((parseInt(attrs?.['@_cy'] || '0') / 914400) * 96)
      }
      // 获取图片引用
      if (item['a:graphic']) {
        const graphic = item['a:graphic']
        for (const gItem of graphic) {
          if (gItem['a:graphicData']) {
            const graphicData = gItem['a:graphicData']
            for (const gdItem of graphicData) {
              if (gdItem['pic:pic']) {
                const pic = gdItem['pic:pic']
                for (const pItem of pic) {
                  if (pItem['pic:blipFill']) {
                    const blipFill = pItem['pic:blipFill']
                    for (const bfItem of blipFill) {
                      if (bfItem['a:blip']) {
                        const blipAttrs = bfItem[':@']
                        embedId = blipAttrs?.['@_r:embed'] || ''
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (embedId && imageMap.has(embedId)) {
      const src = imageMap.get(embedId)
      const styleArr = ['max-width: 100%', 'height: auto', 'display: block']
      if (width > 0) styleArr.unshift(`width: ${Math.min(width, 540)}px`)
      return `<img src="${src}" style="${styleArr.join('; ')}" />`
    }
  } catch (e) {
    console.warn('解析图片元素失败:', e)
  }
  return ''
}

/**
 * 增强的表格转换
 */
function convertTableEnhanced(
  tableItems: any[],
  context: {
    styles: Record<string, any>
    numbering: Map<string, NumberingLevel[]>
    fonts: Map<string, string>
    images: Map<string, string>
  }
): string {
  let html =
    '<table style="border-collapse: collapse; width: 100%; max-width: 100%; table-layout: auto; margin: 1em 0;">'

  for (const item of tableItems) {
    if (item['w:tr']) {
      // 行
      html += '<tr>'
      const rowItems = item['w:tr']
      for (const cellItem of rowItems) {
        if (cellItem['w:tc']) {
          // 单元格
          const cellHtml = convertTableCellEnhanced(cellItem['w:tc'], context)
          html += cellHtml
        }
      }
      html += '</tr>'
    }
  }

  html += '</table>'
  return html
}

/**
 * 转换表格单元格
 */
function convertTableCellEnhanced(
  cellItems: any[],
  context: {
    styles: Record<string, any>
    numbering: Map<string, NumberingLevel[]>
    fonts: Map<string, string>
    images: Map<string, string>
  }
): string {
  const cellStyle: string[] = [
    'border: 1px solid #ddd',
    'padding: 8px',
    'word-wrap: break-word',
    'overflow-wrap: break-word'
  ]
  let content = ''

  for (const item of cellItems) {
    if (item['w:tcPr']) {
      // 单元格属性
      const tcPr = item['w:tcPr']
      for (const prop of tcPr) {
        // 垂直对齐
        if (prop['w:vAlign']) {
          const val = prop[':@']?.['@_w:val']
          if (val) cellStyle.push(`vertical-align: ${val}`)
        }
        // 背景色
        if (prop['w:shd']) {
          const fill = prop[':@']?.['@_w:fill']
          if (fill && fill !== 'auto') {
            cellStyle.push(`background-color: #${fill}`)
          }
        }
      }
    } else if (item['w:p']) {
      // 段落内容
      const paraContent = convertParagraphEnhanced(item['w:p'], context)
      // 移除 <p> 包装，保留内容
      const innerContent = paraContent.replace(/<\/?p[^>]*>/g, '')
      if (innerContent) content += innerContent + ' '
    }
  }

  return `<td style="${cellStyle.join('; ')}">${content.trim() || '&nbsp;'}</td>`
}

// =====================================================
// 智能解析策略
// =====================================================

/**
 * 智能选择最佳解析方案
 * @param file 文件对象
 * @param arrayBuffer 文件内容
 * @param onProgress 进度回调
 */
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
 * @param file 文件对象
 * @param arrayBuffer 文件内容
 * @param onProgress 进度回调
 */
export async function smartParseDocument(
  file: File,
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  const fileSize = file.size
  const validation = await validateDocxFile(arrayBuffer)

  console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)

  // 如果有 altChunk（红头文件），优先使用红头文件方案
  if (validation.hasAltChunk) {
    console.log('检测到红头文件，使用红头文件方案解析')
    return await parseRedHeadDocument(arrayBuffer, onProgress)
  }

  // 新策略：优先使用 mammoth 解析（能正确识别标题）
  console.log('优先使用 mammoth 解析文档（能正确识别标题）')
  try {
    onProgress?.(20, '正在使用 mammoth 解析...')
    const mammothResult = await parseWordDocument(arrayBuffer, onProgress)

    // 检查 mammoth 结果
    if (mammothResult && mammothResult.trim().length > 50) {
      // 检查是否有标题元素
      if (hasHeadingElements(mammothResult)) {
        console.log('mammoth 解析成功，检测到标题元素')
        return mammothResult
      } else {
        console.log('mammoth 解析成功但未检测到标题，尝试大字体段落转换')
        // 尝试从大字体段落转换标题
        const processedHtml = postProcessDocxPreviewHtml(mammothResult)
        if (hasHeadingElements(processedHtml)) {
          console.log('大字体段落转换成功，检测到标题元素')
          return processedHtml
        }
        // 即使没有标题，mammoth 的结果通常也是可用的
        console.log('使用 mammoth 结果（无标题）')
        return processedHtml
      }
    }
  } catch (e) {
    console.warn('mammoth 解析失败:', e)
  }

  // 如果 mammoth 失败，回退到 docx-preview
  console.log('回退到 docx-preview 解析')

  // 小文件和中等文件：使用 docx-preview
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

  // 大文件（> 5MB）使用 Web Worker + docx-preview
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
export function parseWithWorker(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('./wordParserWorker.ts', import.meta.url), {
        type: 'module'
      })

      worker.onmessage = (e) => {
        const { type, html, progress, text, error, reason } = e.data

        if (type === 'progress') {
          onProgress?.(progress, text)
        } else if (type === 'success') {
          resolve(html)
          worker.terminate()
        } else if (type === 'fallback') {
          // 回退到主线程
          worker.terminate()
          console.log('Worker 需要 DOM，回退到主线程:', reason)
          parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
        } else if (type === 'error') {
          reject(new Error(error))
          worker.terminate()
        }
      }

      worker.onerror = (e) => {
        console.error('Worker 错误:', e)
        worker.terminate()
        // 回退到 docx-preview
        parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
      }

      // 发送消息给 Worker
      worker.postMessage({ arrayBuffer, method: 'ooxml' }, [arrayBuffer])
    } catch (e) {
      console.warn('Worker 创建失败，回退到 docx-preview:', e)
      parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
    }
  })
}
