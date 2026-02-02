/**
 * Markdown 转 HTML 转换器
 * 将 Markdown 格式文本转换为编辑器可用的 HTML
 */

import { createPlaceholderManager, encodeHtmlEntities } from './shared'

/**
 * 将普通 Markdown 内容转换为 HTML（不包含红头文件标记）
 * @param content Markdown 内容
 * @returns HTML 内容
 */
const convertMarkdownContent = (content: string): string => {
  if (!content || content.trim() === '') return ''

  // 创建占位符管理器
  const pm = createPlaceholderManager()

  // 处理代码块 ```language\ncode\n```
  let html = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escapedCode = encodeHtmlEntities(code)
    const langClass = lang ? ` class="language-${lang}"` : ''
    return pm.add(`<pre><code${langClass}>${escapedCode}</code></pre>`)
  })

  // 处理块级 AI 模块标记 :::ai ... :::
  html = html.replace(/:::ai\s+([\s\S]*?)\s*:::/g, (_match, aiContent) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    // 将内容按换行分割为段落
    const trimmedContent = aiContent.trim()
    let innerHtml = ''
    if (trimmedContent) {
      // 将换行转换为段落
      const paragraphs = trimmedContent
        .split(/\n\n|\n/)
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.trim()}</p>`)
      innerHtml = paragraphs.length > 0 ? paragraphs.join('') : `<p>${trimmedContent}</p>`
    } else {
      innerHtml = '<p></p>'
    }
    return pm.add(
      `<div data-type="ai-block-node" data-ai-id="${id}" class="ai-block-node">${innerHtml}</div>`
    )
  })

  // 处理行内 AI 模块标记 ==AI[内容]AI== - 转换为块级 AI 模块
  html = html.replace(/==AI\[([\s\S]*?)\]AI==/g, (_match, aiContent) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const innerHtml = aiContent.trim() ? `<p>${aiContent.trim()}</p>` : '<p></p>'
    return pm.add(
      `<div data-type="ai-block-node" data-ai-id="${id}" class="ai-block-node">${innerHtml}</div>`
    )
  })

  // 处理图片 ![alt](url)
  html = html.replace(
    /!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)/g,
    (_match, alt, url) => {
      return pm.add(
        `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
      )
    }
  )

  // 处理 Markdown 链接 [text](url)
  html = html.replace(
    /\[((?:[^\[\]]|\[[^\]]*\])+)\]\(([^)]+)\)/g,
    (_match, text, url) => {
      return pm.add(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline cursor-pointer">${text}</a>`
      )
    }
  )

  // 保留带对齐样式的 HTML 标签（段落和标题）
  // 这些是从 htmlToMarkdown 保存时保留的原始 HTML
  html = html.replace(
    /<(p|h[1-6])([^>]*text-align:\s*(center|right|justify)[^>]*)>([\s\S]*?)<\/\1>/gi,
    (match) => pm.add(match)
  )

  // 保留带颜色样式的 span 标签（字体颜色）
  html = html.replace(
    /<span[^>]*style="[^"]*color\s*:[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => pm.add(match)
  )

  // 保留带背景色的 mark 标签（背景高亮）
  html = html.replace(
    /<mark[^>]*(?:style="[^"]*background[^"]*"|data-color="[^"]*")[^>]*>[\s\S]*?<\/mark>/gi,
    (match) => pm.add(match)
  )

  // 保留简单的 mark 标签（默认高亮）
  html = html.replace(/<mark>[\s\S]*?<\/mark>/gi, (match) => pm.add(match))

  html = html
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 删除线
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // 高亮文本 ==text==
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    // 水平线
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*\*\*$/gm, '<hr>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 自动链接裸 URL
    .replace(/(\(|（)?(https?:\/\/[^\s<>]+)(\)|）)?/g, (_m, l, url, r) => {
      const left = l || ''
      const right = r || ''
      return `${left}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline cursor-pointer">${url}</a>${right}`
    })
    // 段落
    .replace(/\n\n/g, '</p><p>')

  // 包裹在段落中
  html = '<p>' + html + '</p>'

  // 清理多余的空段落
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<h[1-6]>)/g, '$1')
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1')
  html = html.replace(/<p>(<blockquote>)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
  html = html.replace(/<p>(<li>)/g, '<ul>$1')
  html = html.replace(/(<\/li>)<\/p>/g, '$1</ul>')
  html = html.replace(/<p>(XYZPLACEHOLDER\d+XYZ)<\/p>/g, '$1') // 清理代码块周围的段落

  // 合并连续的列表项
  html = html.replace(/<\/ul><ul>/g, '')

  // 恢复占位符内容
  html = pm.restore(html)

  return html
}

/**
 * Markdown 转 HTML
 * 支持红头文件标记块 <!-- REDHEADER:type -->...<!-- /REDHEADER -->
 * @param markdown Markdown 文本
 * @returns HTML 内容
 */
export const markdownToHtml = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') return ''

  // 检查是否包含红头文件标记（更宽松的正则，允许空格和换行）
  const redHeaderPattern =
    /<!--\s*REDHEADER:(\w+)\s*-->\s*([\s\S]*?)\s*<!--\s*\/REDHEADER\s*-->/
  const match = markdown.match(redHeaderPattern)

  if (match) {
    // 提取红头文件 HTML 和剩余内容
    const redHeaderHtml = match[2].trim()
    const restContent = markdown.replace(redHeaderPattern, '').trim()

    // 转换剩余内容为 HTML
    const restHtml = restContent ? convertMarkdownContent(restContent) : ''

    // 组合红头文件 HTML 和剩余内容
    return (redHeaderHtml + restHtml).trim()
  }

  // 没有红头文件标记，使用普通转换
  return convertMarkdownContent(markdown)
}
