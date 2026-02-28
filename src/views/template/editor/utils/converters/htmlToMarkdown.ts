import {
  protectStyledTags,
  restoreStyledTags,
  decodeHtmlEntities
} from './shared'
import { extractRedHeader } from '../redHeader/detector'

const convertContentToMarkdown = (content: string): string => {
  if (!content || content.trim() === '') return ''

  const { html: protectedHtml, placeholders } = protectStyledTags(content)

  let markdown = protectedHtml
    // :::ai 块级 AI 模块语法
    .replace(
      /<div[^>]*(?:data-type="ai-block-node"|class="[^"]*ai-block-node[^"]*")[^>]*>([\s\S]*?)<\/div>/gi,
      (match, innerHtml) => {
        const titleMatch = match.match(/data-ai-title="([^"]*)"/i)
        const title = titleMatch ? titleMatch[1] : ''

        const { html: protectedInner, placeholders: innerPlaceholders } =
          protectStyledTags(innerHtml)

        let innerContent = protectedInner
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<\/?ul[^>]*>/gi, '\n')
          .replace(/<\/?ol[^>]*>/gi, '\n')
          .replace(/<br[^>]*\/?>/gi, '\n')
          .replace(/<(?!___)[^>]+>/g, '')

        innerContent = decodeHtmlEntities(innerContent)
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        innerContent = restoreStyledTags(innerContent, innerPlaceholders)

        const titleLine = title ? `title: ${title}\n` : ''
        return `\n:::ai\n${titleLine}${innerContent}\n:::\n\n`
      }
    )
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
    .replace(
      /<span[^>]*(?:data-type="ai-block"|class="[^"]*ai-block[^"]*")[^>]*>(.*?)<\/span>/gi,
      '\n\n:::ai\n$1\n:::\n\n'
    )
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
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    .replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
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
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<p([^>]*)>(.*?)<\/p>/gi, (_, attrs, content) => {
      if (/text-align:\s*(center|right|justify)/i.test(attrs)) {
        return `___ALIGN_P_START___${attrs}___ALIGN_P_MID___${content}___ALIGN_P_END___\n\n`
      }
      return content + '\n\n'
    })
    .replace(/<br[^>]*\/?>/gi, '\n')
    .replace(/<(?!___)[^>]+>/g, '')
    .replace(
      /___ALIGN_P_START___(.*?)___ALIGN_P_MID___(.*?)___ALIGN_P_END___/g,
      '<p$1>$2</p>'
    )
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

  markdown = decodeHtmlEntities(markdown)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  markdown = restoreStyledTags(markdown, placeholders)

  return markdown
}

/** 使用 <!-- REDHEADER:type --> 标记块保留红头文件完整 HTML */
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
