/**
 * Markdown 文档解析器
 * 直接读取 Markdown 文件内容（文本格式）
 */

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
 * 预处理 Markdown 文本，转换自定义语法
 * @param text Markdown 文本
 * @returns 预处理后的 Markdown 文本
 */
const preprocessMarkdown = (text: string): string => {
  let result = text

  // 处理块级 AI 模块标记 :::ai ... :::
  // 支持多行格式：:::ai\n内容\n:::
  // 支持单行格式：:::ai 内容 ::: 或 :::ai 内容:::
  // 支持 title: xxx 格式的标题行
  result = result.replace(/:::ai\s+([\s\S]*?)\s*:::/g, (_, content) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 提取 title（如果有）
    let title = ''
    let actualContent = content.trim()
    const titleMatch = actualContent.match(/^title:\s*(.*)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
      actualContent = actualContent.replace(/^title:\s*.*\n?/m, '').trim()
    }

    // 将内部 Markdown 转换为 HTML
    let innerHtml = ''
    if (actualContent) {
      innerHtml = md.render(actualContent)
      if (!innerHtml.trim()) {
        innerHtml = `<p>${actualContent}</p>`
      }
    } else {
      innerHtml = '<p></p>'
    }

    const titleAttr = title ? ` data-ai-title="${title}"` : ''
    return `<div data-type="ai-block-node" data-ai-id="${id}"${titleAttr} class="ai-block-node">${innerHtml}</div>`
  })

  // 处理行内 AI 模块标记 ==AI[内容]AI== - 转换为块级 AI 模块
  result = result.replace(/==AI\[(.*?)\]AI==/g, (_, content) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const innerHtml = content.trim() ? `<p>${content}</p>` : '<p></p>'
    return `<div data-type="ai-block-node" data-ai-id="${id}" class="ai-block-node">${innerHtml}</div>`
  })

  return result
}

/**
 * 解析 Markdown 文件 (.md)
 * 读取文件内容并返回原始 Markdown 文本
 * @param file Markdown 文件
 * @returns Markdown 文本内容
 */
export const parseMarkdownFile = async (file: File): Promise<string> => {
  try {
    // 尝试多种编码
    let markdown: string

    // 首先尝试 UTF-8
    try {
      markdown = await file.text()
    } catch {
      // 如果 UTF-8 失败，尝试其他编码
      const arrayBuffer = await file.arrayBuffer()

      // 尝试 GBK 编码（适用于中文 Windows 文件）
      try {
        const decoder = new TextDecoder('gbk')
        markdown = decoder.decode(arrayBuffer)
      } catch {
        // 如果 GBK 也失败，使用默认编码
        const decoder = new TextDecoder()
        markdown = decoder.decode(arrayBuffer)
      }
    }

    // 基本清理
    markdown = markdown
      // 移除 BOM
      .replace(/^\uFEFF/, '')
      // 统一换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

    return markdown
  } catch (error) {
    console.error('Markdown 文件解析失败:', error)
    throw new Error('Markdown 文件解析失败，请确保文件格式正确')
  }
}

/**
 * 从 Blob 解析 Markdown 内容
 * 用于从网络响应获取 Markdown 内容
 * @param blob Blob 数据
 * @returns Markdown 文本内容
 */
export const parseMarkdownBlob = async (blob: Blob): Promise<string> => {
  try {
    const file = new File([blob], 'temp.md', { type: 'text/markdown' })
    return await parseMarkdownFile(file)
  } catch (error) {
    console.error('Markdown Blob 解析失败:', error)
    throw new Error('Markdown 内容解析失败')
  }
}

/**
 * 验证 Markdown 内容
 * 检查内容是否为有效的 Markdown 格式
 * @param content 内容字符串
 * @returns 是否为有效的 Markdown
 */
export const isValidMarkdown = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false

  // 基本检查：是否包含常见的 Markdown 标记
  const markdownPatterns = [
    /^#+\s/m, // 标题
    /\*\*[^*]+\*\*/, // 粗体
    /\*[^*]+\*/, // 斜体
    /\[.+\]\(.+\)/, // 链接
    /^-\s/m, // 无序列表
    /^\d+\.\s/m, // 有序列表
    /```[\s\S]*```/, // 代码块
    /`[^`]+`/, // 行内代码
    /^>/m // 引用
  ]

  // 检查是否匹配任一 Markdown 模式
  const hasMarkdownSyntax = markdownPatterns.some((pattern) => pattern.test(content))

  // 检查是否主要是纯文本（不是 HTML）
  const htmlTagCount = (content.match(/<[^>]+>/g) || []).length
  const isMainlyText = htmlTagCount < content.length / 100

  return hasMarkdownSyntax || isMainlyText
}

/**
 * 解析 Markdown 文件并转换为 HTML
 * 使用 markdown-it 库转换为 HTML
 * @param file Markdown 文件
 * @returns 解析后的 HTML 内容
 */
export const parseMarkdownDocument = async (file: File): Promise<string> => {
  try {
    const text = await file.text()

    // 预处理 Markdown，转换自定义语法（AI 模块等）
    const preprocessedText = preprocessMarkdown(text)

    // 使用 markdown-it 将 Markdown 转换为 HTML
    const html = md.render(preprocessedText)

    return html
  } catch (error) {
    console.error('Markdown 文档解析失败:', error)
    throw new Error('Markdown 文档解析失败，请确保文件格式正确')
  }
}

/**
 * 将 Markdown 文本转换为 HTML（使用 markdown-it）
 * @param markdown Markdown 文本
 * @returns HTML 内容
 */
export const markdownToHtmlMd = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') return ''

  // 预处理 Markdown，转换自定义语法
  const preprocessedText = preprocessMarkdown(markdown)

  // 使用 markdown-it 转换
  return md.render(preprocessedText)
}
