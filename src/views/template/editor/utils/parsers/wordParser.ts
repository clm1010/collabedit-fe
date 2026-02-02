/**
 * Word 文档解析器
 * 使用 mammoth 库将 Word 文档转换为 HTML
 */

import mammoth from 'mammoth'

/**
 * mammoth 样式映射配置
 * 用于将 Word 样式转换为 HTML 标签
 */
export const mammothStyleMap = [
  // 标题映射
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='标题 3'] => h3:fresh",
  "p[style-name='标题 4'] => h4:fresh",
  // 引用映射
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Block Text'] => blockquote:fresh",
  // 代码块映射
  "p[style-name='Code'] => pre:fresh",
  "r[style-name='Code Char'] => code",
  // 保留格式
  'b => strong',
  'i => em',
  'u => u',
  'strike => s'
]

/**
 * 清理 Word 导出的 HTML
 * 移除多余的 Word 特有样式，保持排版
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
export const cleanWordHtml = (html: string): string => {
  let result = html

  // 移除多余的连续空段落
  result = result.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格
  result = result.replace(/&nbsp;&nbsp;+/g, ' ')

  // 移除 Word 特有的 mso- 样式
  result = result.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')

  // 移除空的 style 属性
  result = result.replace(/style="\s*"/g, '')

  // 移除 Word 特有的 class
  result = result.replace(/class="[^"]*Mso[^"]*"/gi, '')

  // 处理图片宽度 - 限制最大宽度
  const MAX_IMAGE_WIDTH = 540

  result = result.replace(/<img([^>]*)style="([^"]*)"/gi, (_match, attrs, style) => {
    const widthMatch = style.match(/width:\s*([^;]+)/i)
    let width = 0

    if (widthMatch) {
      const widthStr = widthMatch[1].trim()
      if (widthStr.endsWith('pt')) {
        width = parseFloat(widthStr) * 1.33
      } else if (widthStr.endsWith('in')) {
        width = parseFloat(widthStr) * 96
      } else if (widthStr.endsWith('cm')) {
        width = parseFloat(widthStr) * 37.8
      } else if (widthStr.endsWith('mm')) {
        width = parseFloat(widthStr) * 3.78
      } else if (!widthStr.endsWith('%')) {
        width = parseFloat(widthStr) || 0
      }
    }

    let newStyle = style
    if (width > MAX_IMAGE_WIDTH) {
      newStyle = style
        .replace(/width:\s*[^;]+;?/i, `width: ${MAX_IMAGE_WIDTH}px;`)
        .replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    if (!newStyle.includes('max-width')) {
      newStyle += '; max-width: 100%'
    }
    if (!newStyle.includes('height: auto')) {
      newStyle = newStyle.replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    return `<img${attrs}style="${newStyle}; display: block;"`
  })

  // 处理没有 style 属性的图片
  result = result.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  return result
}

/**
 * 解析 Word 文档 (.docx)
 * 使用 mammoth 库转换为 HTML，保留格式、字体、颜色、表格和图片
 * @param file Word 文件
 * @returns 解析后的 HTML 内容
 */
export const parseWordDocument = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()

    // 配置转换选项
    const options: any = {
      styleMap: mammothStyleMap,
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      // 处理图片 - 转换为 base64
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${imageBuffer}`
          }
        })
      })
    }

    // 解析文档
    const result = await mammoth.convertToHtml({ arrayBuffer }, options)

    // 清理 HTML
    const html = cleanWordHtml(result.value)

    // 输出警告信息（调试用）
    if (result.messages && result.messages.length > 0) {
      const seriousMessages = result.messages.filter((m: any) => m.type === 'error')
      if (seriousMessages.length > 0) {
        console.error('Word 转换错误:', seriousMessages)
      } else {
        console.info('Word 转换提示:', result.messages)
      }
    }

    return html
  } catch (error) {
    console.error('Word 文档解析失败:', error)
    throw new Error('Word 文档解析失败，请确保文件格式正确')
  }
}
