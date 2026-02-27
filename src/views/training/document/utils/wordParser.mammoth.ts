import type { ParseProgressCallback } from './wordParser/types'
import { detectWordFormat } from './wordParser.shared'
import {
  cleanWordHtml,
  convertInlineStylesToTiptap,
  convertLargeFontParagraphsToHeadings
} from './wordParser.postprocess'

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
    onProgress?.(20, '正在检测文件格式...')
    const bytes = new Uint8Array(arrayBuffer)
    const format = detectWordFormat(bytes)

    if (format === 'doc') {
      const error = new Error('DOC_FORMAT_NOT_SUPPORTED')
      ;(error as any).isDocFormat = true
      throw error
    }

    if (format === 'unknown') {
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
        if (bodyMatch) {
          return bodyMatch[1].trim()
        }
        return text
      }

      throw new Error('不支持的文件格式，请上传 .docx 文件')
    }

    onProgress?.(30, '正在加载 Word 解析库...')
    const mammoth = await import('mammoth')

    onProgress?.(40, '正在配置解析选项...')
    const options: any = {
      styleMap: mammothStyleMap,
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true
    }

    const mammothLib = mammoth.default || mammoth
    if (mammothLib.images && mammothLib.images.imgElement) {
      options.convertImage = mammothLib.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${imageBuffer.replace(/[\s\r\n]+/g, '')}`
          }
        })
      })
    } else {
      options.convertImage = {
        'image/png': async (image: any) => {
          const buffer = (await image.read('base64')).replace(/[\s\r\n]+/g, '')
          return { src: `data:image/png;base64,${buffer}` }
        },
        'image/jpeg': async (image: any) => {
          const buffer = (await image.read('base64')).replace(/[\s\r\n]+/g, '')
          return { src: `data:image/jpeg;base64,${buffer}` }
        },
        'image/gif': async (image: any) => {
          const buffer = (await image.read('base64')).replace(/[\s\r\n]+/g, '')
          return { src: `data:image/gif;base64,${buffer}` }
        }
      }
    }

    onProgress?.(50, '正在解析 Word 文档...')
    const result = await mammothLib.convertToHtml({ arrayBuffer }, options)

    onProgress?.(70, '正在处理文档内容...')
    let html = result.value

    onProgress?.(80, '正在优化文档格式...')
    html = cleanWordHtml(html)

    const headingPattern = /<h[1-6][^>]*>/i
    if (!headingPattern.test(html)) {
      html = convertLargeFontParagraphsToHeadings(html)
    }

    html = convertInlineStylesToTiptap(html)
    return html
  } catch (error) {
    console.error('Word 文档解析失败:', error)
    throw error
  }
}
