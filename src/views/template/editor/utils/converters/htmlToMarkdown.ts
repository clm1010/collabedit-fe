/**
 * HTML 转 Markdown 转换器
 * 将编辑器 HTML 内容转换为 Markdown 格式用于保存
 */

import {
  protectStyledTags,
  restoreStyledTags,
  decodeHtmlEntities
} from './shared'
import { extractRedHeader } from '../redHeader/detector'

/**
 * 将普通 HTML 内容转换为 Markdown（不包含红头文件）
 * @param content HTML 内容
 * @returns Markdown 文本
 */
const convertContentToMarkdown = (content: string): string => {
  if (!content || content.trim() === '') return ''

  // 首先保护带样式的标签（字体颜色、背景高亮）
  const { html: protectedHtml, placeholders } = protectStyledTags(content)

  let markdown = protectedHtml
    // 处理块级 AI 模块 - 使用 :::ai 语法，支持 title 属性
    .replace(
      /<div[^>]*(?:data-type="ai-block-node"|class="[^"]*ai-block-node[^"]*")[^>]*>([\s\S]*?)<\/div>/gi,
      (match, innerHtml) => {
        // 提取 title 属性
        const titleMatch = match.match(/data-ai-title="([^"]*)"/i)
        const title = titleMatch ? titleMatch[1] : ''

        // 保护 AI 模块内部的样式标签
        const { html: protectedInner, placeholders: innerPlaceholders } =
          protectStyledTags(innerHtml)

        // 递归处理内部内容
        let innerContent = protectedInner
          // 处理标题
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          // 处理粗体和斜体
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          // 处理段落
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          // 处理列表项
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          // 移除列表标签
          .replace(/<\/?ul[^>]*>/gi, '\n')
          .replace(/<\/?ol[^>]*>/gi, '\n')
          // 处理换行
          .replace(/<br[^>]*\/?>/gi, '\n')
          // 移除其他标签（但跳过占位符）
          .replace(/<(?!___)[^>]+>/g, '')

        // 解码 HTML 实体
        innerContent = decodeHtmlEntities(innerContent)
          // 清理多余空行
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        // 恢复 AI 模块内部的样式标签
        innerContent = restoreStyledTags(innerContent, innerPlaceholders)

        // 如果有标题，添加标题行
        const titleLine = title ? `title: ${title}\n` : ''
        return `\n:::ai\n${titleLine}${innerContent}\n:::\n\n`
      }
    )
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
    // 处理旧版行内 AI 模块标记 - 转换为块级 :::ai 语法
    .replace(
      /<span[^>]*(?:data-type="ai-block"|class="[^"]*ai-block[^"]*")[^>]*>(.*?)<\/span>/gi,
      '\n\n:::ai\n$1\n:::\n\n'
    )
    // 处理标题 - 保留带对齐样式的 HTML 标签（使用占位符保护）
    .replace(/<h1([^>]*)>(.*?)<\/h1>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H1_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H1_END___\n\n`
      }
      return `# ${content}\n\n`
    })
    .replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H2_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H2_END___\n\n`
      }
      return `## ${content}\n\n`
    })
    .replace(/<h3([^>]*)>(.*?)<\/h3>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H3_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H3_END___\n\n`
      }
      return `### ${content}\n\n`
    })
    .replace(/<h4([^>]*)>(.*?)<\/h4>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H4_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H4_END___\n\n`
      }
      return `#### ${content}\n\n`
    })
    .replace(/<h5([^>]*)>(.*?)<\/h5>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H5_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H5_END___\n\n`
      }
      return `##### ${content}\n\n`
    })
    .replace(/<h6([^>]*)>(.*?)<\/h6>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_H6_START___${attrs}___ALIGN_H_MID___${content}___ALIGN_H6_END___\n\n`
      }
      return `###### ${content}\n\n`
    })
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
    // 处理段落 - 保留带对齐样式的 HTML 标签（使用占位符保护）
    .replace(/<p([^>]*)>(.*?)<\/p>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        // 使用特殊占位符保护带对齐样式的段落
        return `___ALIGN_P_START___${attrs}___ALIGN_P_MID___${content}___ALIGN_P_END___\n\n`
      }
      return content + '\n\n'
    })
    // 处理换行
    .replace(/<br[^>]*\/?>/gi, '\n')
    // 移除其他 HTML 标签（但跳过占位符，占位符以 ___ 开头）
    .replace(/<(?!___)[^>]+>/g, '')
    // 恢复带对齐样式的段落
    .replace(
      /___ALIGN_P_START___(.*?)___ALIGN_P_MID___(.*?)___ALIGN_P_END___/g,
      '<p$1>$2</p>'
    )
    // 恢复带对齐样式的标题
    .replace(
      /___ALIGN_H1_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H1_END___/g,
      '<h1$1>$2</h1>'
    )
    .replace(
      /___ALIGN_H2_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H2_END___/g,
      '<h2$1>$2</h2>'
    )
    .replace(
      /___ALIGN_H3_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H3_END___/g,
      '<h3$1>$2</h3>'
    )
    .replace(
      /___ALIGN_H4_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H4_END___/g,
      '<h4$1>$2</h4>'
    )
    .replace(
      /___ALIGN_H5_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H5_END___/g,
      '<h5$1>$2</h5>'
    )
    .replace(
      /___ALIGN_H6_START___(.*?)___ALIGN_H_MID___(.*?)___ALIGN_H6_END___/g,
      '<h6$1>$2</h6>'
    )

  // 解码 HTML 实体
  markdown = decodeHtmlEntities(markdown)
    // 清理多余的空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 恢复被保护的样式标签（字体颜色、背景高亮）
  markdown = restoreStyledTags(markdown, placeholders)

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

  // 1. 检测并提取红头文件
  const redHeader = extractRedHeader(htmlContent)

  let result = ''
  let contentToConvert = htmlContent

  if (redHeader) {
    // 红头文件使用标记块保留完整 HTML
    result = `<!-- REDHEADER:${redHeader.type} -->\n${redHeader.header}\n<!-- /REDHEADER -->\n\n`
    contentToConvert = redHeader.rest
  }

  // 2. 转换剩余内容为标准 Markdown
  const markdown = convertContentToMarkdown(contentToConvert)

  return (result + markdown).trim()
}
