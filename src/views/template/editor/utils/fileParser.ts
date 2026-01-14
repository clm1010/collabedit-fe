/**
 * 文件解析工具
 * 用于 Markdown 编辑器的文件导入和导出
 * 支持 Word (.docx) 和 Markdown (.md) 格式
 */

import mammoth from 'mammoth'
import MarkdownIt from 'markdown-it'

/**
 * Markdown 解析器配置
 */
const md = new MarkdownIt({
  html: true, // 允许 HTML 标签
  breaks: true, // 将换行符转换为 <br>
  linkify: true, // 自动识别链接
  typographer: true // 启用智能引号等排版功能
})

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
  // 移除多余的连续空段落
  html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格
  html = html.replace(/&nbsp;&nbsp;+/g, ' ')

  // 移除 Word 特有的 mso- 样式
  html = html.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')

  // 移除空的 style 属性
  html = html.replace(/style="\s*"/g, '')

  // 移除 Word 特有的 class
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, '')

  // 处理图片宽度 - 限制最大宽度
  const MAX_IMAGE_WIDTH = 540

  html = html.replace(/<img([^>]*)style="([^"]*)"/gi, (_match, attrs, style) => {
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
  html = html.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  return html
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

/**
 * 解析 Markdown 文件
 * 使用 markdown-it 库转换为 HTML
 * @param file Markdown 文件
 * @returns 解析后的 HTML 内容
 */
export const parseMarkdownDocument = async (file: File): Promise<string> => {
  try {
    const text = await file.text()

    // 使用 markdown-it 将 Markdown 转换为 HTML
    const html = md.render(text)

    return html
  } catch (error) {
    console.error('Markdown 文档解析失败:', error)
    throw new Error('Markdown 文档解析失败，请确保文件格式正确')
  }
}

/**
 * 检测并提取红头文件区块
 * 红头文件特征：包含红色文字（#ff0000）和红色横线（data-line-color 或 class="red-line"）
 * @param html HTML 内容
 * @returns 红头文件区块和剩余内容，如果没有检测到则返回 null
 */
const extractRedHeader = (html: string): { header: string; rest: string; type: string } | null => {
  // 调试日志
  console.log('extractRedHeader: 检测红头文件...')
  console.log('HTML 内容前200字符:', html.substring(0, 200))

  // 查找红色横线的位置（红头文件的结束标志）
  const redLineMatch = html.match(/<hr[^>]*(?:data-line-color|class="[^"]*red)[^>]*\/?>/i)
  console.log('红色横线匹配结果:', redLineMatch ? '找到' : '未找到')

  if (!redLineMatch || redLineMatch.index === undefined) {
    console.log('未找到红色横线，不是红头文件')
    return null
  }

  // 提取从开头到红色横线的内容
  const headerEndIndex = redLineMatch.index + redLineMatch[0].length
  const potentialHeader = html.slice(0, headerEndIndex)

  // 验证是否包含红头文件的特征：红色文字
  // 支持多种颜色格式：#ff0000, #FF0000, rgb(255, 0, 0), red
  const hasRedColor =
    /color\s*:\s*#ff0000/i.test(potentialHeader) ||
    /color\s*:\s*rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\)/i.test(potentialHeader) ||
    /color\s*:\s*red\b/i.test(potentialHeader)

  console.log('是否包含红色文字:', hasRedColor)

  if (!hasRedColor) {
    console.log('未检测到红色文字，不是红头文件')
    return null
  }

  // 判断红头文件类型：标准版包含更多元素（编号、机密、特急等）
  const isStandard =
    potentialHeader.includes('机密') ||
    potentialHeader.includes('特急') ||
    /<table[^>]*style/i.test(potentialHeader)

  console.log('红头文件类型:', isStandard ? 'standard' : 'simple')
  console.log('红头文件区块长度:', potentialHeader.length)

  return {
    header: potentialHeader,
    rest: html.slice(headerEndIndex),
    type: isStandard ? 'standard' : 'simple'
  }
}

/**
 * 将普通 HTML 内容转换为 Markdown（不包含红头文件）
 * @param content HTML 内容
 * @returns Markdown 文本
 */
const convertContentToMarkdown = (content: string): string => {
  if (!content || content.trim() === '') return ''

  const markdown = content
    // 处理代码块（pre > code）- 使用自定义标记保留
    .replace(
      /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
      (_, lang, code) => {
        const language = lang || ''
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
        return `\n\`\`\`${language}\n${decodedCode}\n\`\`\`\n\n`
      }
    )
    // 处理 AI 模块标记 - 使用自定义语法 ==AI[内容]AI==
    .replace(
      /<span[^>]*(?:data-type="ai-block"|class="[^"]*ai-block[^"]*")[^>]*>(.*?)<\/span>/gi,
      '==AI[$1]AI=='
    )
    // 处理标题
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // 处理粗体和斜体
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // 处理删除线
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    .replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')
    // 处理下划线（Markdown 没有原生下划线，使用 HTML）
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    // 处理行内代码
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // 处理链接
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // 处理图片
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    // 处理普通水平线
    .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
    // 处理引用
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, blockContent) => {
      const cleanContent = blockContent
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
        .replace(/<br[^>]*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
      return (
        cleanContent
          .split('\n')
          .map((line: string) => `> ${line.trim()}`)
          .join('\n') + '\n\n'
      )
    })
    // 处理无序列表项
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // 移除 ul/ol 标签
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    // 处理段落
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // 处理换行
    .replace(/<br[^>]*\/?>/gi, '\n')
    // 移除其他 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 清理多余的空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return markdown
}

/**
 * 将 HTML 内容转换为 Markdown 格式
 * 使用自定义标记块 <!-- REDHEADER:type --> 保留红头文件完整 HTML
 * @param htmlContent HTML 内容
 * @returns Markdown 文本
 */
export const htmlToMarkdown = (htmlContent: string): string => {
  if (!htmlContent || htmlContent.trim() === '') return ''

  console.log('=== htmlToMarkdown 开始 ===')
  console.log('输入 HTML 长度:', htmlContent.length)

  // 1. 检测并提取红头文件
  const redHeader = extractRedHeader(htmlContent)

  let result = ''
  let contentToConvert = htmlContent

  if (redHeader) {
    // 红头文件使用标记块保留完整 HTML
    result = `<!-- REDHEADER:${redHeader.type} -->\n${redHeader.header}\n<!-- /REDHEADER -->\n\n`
    contentToConvert = redHeader.rest
    console.log('已添加红头文件标记块，标记块长度:', result.length)
  } else {
    console.log('未检测到红头文件')
  }

  // 2. 转换剩余内容为标准 Markdown
  const markdown = convertContentToMarkdown(contentToConvert)

  const finalResult = (result + markdown).trim()
  console.log('=== htmlToMarkdown 结束 ===')
  console.log('输出 Markdown 长度:', finalResult.length)
  console.log('Markdown 前200字符:', finalResult.substring(0, 200))

  return finalResult
}

/**
 * 将编辑器内容导出为 Markdown
 * @param markdown Markdown 内容
 * @param filename 文件名
 */
export const exportMarkdown = (markdown: string, filename: string): void => {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 生成预览用的完整 HTML 文档
 * @param content 编辑器内容
 * @param title 文档标题
 * @returns 完整的 HTML 文档字符串
 */
export const generatePreviewHtml = (content: string, title: string): string => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
      background: #fff;
    }
    h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; color: #111; }
    h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; color: #222; }
    h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.5em; color: #333; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; margin: 1em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.3em 0; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
      background: #f8f9fa;
      padding: 1em 1em 1em 1.5em;
      border-radius: 0 4px 4px 0;
    }
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      color: #e83e8c;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 1em 0; 
      table-layout: auto;
    }
    th, td { 
      border: 1px solid #e5e7eb; 
      padding: 10px 14px; 
      text-align: left; 
      vertical-align: top; 
    }
    th { 
      background: #f9fafb; 
      font-weight: 600; 
      color: #374151; 
    }
    tr:nth-child(even) { background: #fafafa; }
    a { color: #2563eb; text-decoration: underline; }
    a:hover { color: #1d4ed8; }
    img { 
      max-width: 100%; 
      height: auto; 
      display: block; 
      margin: 1em auto;
      border-radius: 4px;
    }
    mark { background: #fef08a; padding: 0 2px; border-radius: 2px; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    s { text-decoration: line-through; color: #888; }
    u { text-decoration: underline; }
    hr { 
      border: none; 
      border-top: 2px solid #e5e7eb; 
      margin: 2em 0; 
    }
    /* 任务列表样式 */
    ul[data-type="taskList"] {
      list-style: none;
      padding-left: 0;
    }
    ul[data-type="taskList"] li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    ul[data-type="taskList"] li input[type="checkbox"] {
      margin-top: 5px;
    }
  </style>
</head>
<body>
${content}
</body>
</html>`
}
