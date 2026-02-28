import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true, // 允许 HTML 标签
  breaks: true, // 将换行符转换为 <br>
  linkify: true, // 自动识别链接
  typographer: true // 启用智能引号等排版功能
})

/** 转换 :::ai 和 ==AI[...]AI== 自定义语法为 HTML */
const preprocessMarkdown = (text: string): string => {
  let result = text

  result = result.replace(/:::ai\s+([\s\S]*?)\s*:::/g, (_, content) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    let title = ''
    let actualContent = content.trim()
    const titleMatch = actualContent.match(/^title:\s*(.*)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
      actualContent = actualContent.replace(/^title:\s*.*\n?/m, '').trim()
    }

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

  result = result.replace(/==AI\[(.*?)\]AI==/g, (_, content) => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const innerHtml = content.trim() ? `<p>${content}</p>` : '<p></p>'
    return `<div data-type="ai-block-node" data-ai-id="${id}" class="ai-block-node">${innerHtml}</div>`
  })

  return result
}

export const parseMarkdownFile = async (file: File): Promise<string> => {
  try {
    let markdown: string

    try {
      markdown = await file.text()
    } catch {
      const arrayBuffer = await file.arrayBuffer()

      // GBK 编码回退（适用于中文 Windows 文件）
      try {
        const decoder = new TextDecoder('gbk')
        markdown = decoder.decode(arrayBuffer)
      } catch {
        const decoder = new TextDecoder()
        markdown = decoder.decode(arrayBuffer)
      }
    }

    markdown = markdown
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

    return markdown
  } catch (error) {
    console.error('Markdown 文件解析失败:', error)
    throw new Error('Markdown 文件解析失败，请确保文件格式正确')
  }
}

export const parseMarkdownBlob = async (blob: Blob): Promise<string> => {
  try {
    const file = new File([blob], 'temp.md', { type: 'text/markdown' })
    return await parseMarkdownFile(file)
  } catch (error) {
    console.error('Markdown Blob 解析失败:', error)
    throw new Error('Markdown 内容解析失败')
  }
}

export const isValidMarkdown = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false

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

  const hasMarkdownSyntax = markdownPatterns.some((pattern) => pattern.test(content))

  const htmlTagCount = (content.match(/<[^>]+>/g) || []).length
  const isMainlyText = htmlTagCount < content.length / 100

  return hasMarkdownSyntax || isMainlyText
}

export const parseMarkdownDocument = async (file: File): Promise<string> => {
  try {
    const text = await file.text()
    const preprocessedText = preprocessMarkdown(text)
    const html = md.render(preprocessedText)

    return html
  } catch (error) {
    console.error('Markdown 文档解析失败:', error)
    throw new Error('Markdown 文档解析失败，请确保文件格式正确')
  }
}

export const markdownToHtmlMd = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') return ''
  const preprocessedText = preprocessMarkdown(markdown)
  return md.render(preprocessedText)
}
