import type { ParseProgressCallback } from './wordParser/types'

/**
 * HTML/MHTML 解析模块
 * 用于解析伪装成 .docx 的 HTML/MHTML 文件
 */

/**
 * 解析纯 HTML 格式的伪 docx 文件
 * @param arrayBuffer 文件数据
 * @param onProgress 进度回调
 * @returns 清理后的 HTML 内容
 */
export async function parseHtmlDocument(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(30, '正在解析 HTML 内容...')

  const decoder = new TextDecoder('utf-8')
  let html = decoder.decode(arrayBuffer)

  // 移除 BOM
  html = html.replace(/^\ufeff/, '')

  onProgress?.(50, '正在提取文档内容...')

  // 提取 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    html = bodyMatch[1]
  }

  onProgress?.(70, '正在清理样式...')

  // 清理 Word 特有的标签和样式
  html = cleanWordHtmlTags(html)

  onProgress?.(90, '处理完成')
  return html
}

/**
 * 解析 MHTML 格式的伪 docx 文件
 * @param arrayBuffer 文件数据
 * @param onProgress 进度回调
 * @returns 清理后的 HTML 内容
 */
export async function parseMhtmlDocument(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(20, '正在解析 MHTML 内容...')

  const decoder = new TextDecoder('utf-8')
  const content = decoder.decode(arrayBuffer)

  onProgress?.(40, '正在提取 HTML 部分...')

  // 提取 HTML 部分
  const html = extractHtmlFromMhtml(content)

  onProgress?.(70, '正在优化内容...')

  // 清理 Word 特有的标签和样式
  const cleanedHtml = cleanWordHtmlTags(html)

  onProgress?.(90, '处理完成')
  return cleanedHtml
}

/**
 * 从 MHTML 内容中提取 HTML
 * @param mhtContent MHTML 文件内容
 * @returns 提取的 HTML 内容
 */
function extractHtmlFromMhtml(mhtContent: string): string {
  // 尝试提取 HTML 部分（Content-Type: text/html 之后的内容）
  const htmlMatch = mhtContent.match(
    /Content-Type:\s*text\/html[\s\S]*?\n\n([\s\S]*?)(?=------=|--=_NextPart|$)/i
  )

  if (htmlMatch) {
    let html = htmlMatch[1]

    // 检查编码
    const encodingMatch = mhtContent.match(/Content-Transfer-Encoding:\s*([\w-]+)/i)
    const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : ''

    if (encoding === 'base64') {
      try {
        const cleanBase64 = html.replace(/\s/g, '')
        html = atob(cleanBase64)
      } catch (e) {
        console.warn('Base64 解码失败:', e)
      }
    } else if (encoding === 'quoted-printable') {
      // 解码 quoted-printable
      html = html
        .replace(/=\r?\n/g, '') // 移除软换行
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    }

    // 提取 body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      return bodyMatch[1]
    }
    return html
  }

  // 直接查找 HTML 标签
  const directHtmlMatch = mhtContent.match(/<html[\s\S]*?<\/html>/i)
  if (directHtmlMatch) {
    const bodyMatch = directHtmlMatch[0].match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      return bodyMatch[1]
    }
    return directHtmlMatch[0]
  }

  // 如果都找不到，返回原内容
  return mhtContent
}

/**
 * 清理 Word/WPS 特有的 HTML 标签和样式
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
function cleanWordHtmlTags(html: string): string {
  // 移除 XML 声明
  html = html.replace(/<\?xml[^>]*\?>/gi, '')

  // 移除 Office 命名空间标签
  html = html.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '')
  html = html.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '')
  html = html.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '')
  html = html.replace(/<m:[^>]*>[\s\S]*?<\/m:[^>]*>/gi, '')

  // 移除自闭合的 Office 命名空间标签
  html = html.replace(/<o:[^/>]*\/>/gi, '')
  html = html.replace(/<v:[^/>]*\/>/gi, '')
  html = html.replace(/<w:[^/>]*\/>/gi, '')

  // 移除 mso-* 样式
  html = html.replace(/mso-[^;:"']+:[^;:"']+;?\s*/gi, '')

  // 移除 Word 特有的 class
  html = html.replace(/\s*class="Mso[^"]*"/gi, '')
  html = html.replace(/\s*class='Mso[^']*'/gi, '')

  // 移除 xmlns 属性
  html = html.replace(/\s*xmlns[^=]*="[^"]*"/gi, '')
  html = html.replace(/\s*xmlns[^=]*='[^']*'/gi, '')

  // 移除 HTML 注释（包括条件注释）
  html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // 清理空标签
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, '')
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '')
  html = html.replace(/<div[^>]*>\s*<\/div>/gi, '')

  // 移除空的 style 属性
  html = html.replace(/\s*style="\s*"/gi, '')
  html = html.replace(/\s*style='\s*'/gi, '')

  // 移除 <font> 标签，转换为 <span>
  html = html.replace(/<font([^>]*)>/gi, '<span$1>')
  html = html.replace(/<\/font>/gi, '</span>')

  // 清理连续的空白字符
  html = html.replace(/\s+/g, ' ')

  // 移除段落之间多余的空白
  html = html.replace(/>\s+</g, '><')

  // 恢复必要的空格
  html = html.replace(/<\/p><p/g, '</p>\n<p')
  html = html.replace(/<\/div><div/g, '</div>\n<div')

  return html.trim()
}
