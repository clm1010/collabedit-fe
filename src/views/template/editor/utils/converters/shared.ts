/**
 * 转换器共享工具
 * 包含样式标签保护、HTML 实体编解码等共享功能
 */

/**
 * 样式标签保护结果
 */
export interface StyledTagsProtection {
  html: string
  placeholders: Map<string, string>
}

/**
 * 占位符项
 */
export interface PlaceholderItem {
  placeholder: string
  html: string
}

/**
 * 保护带颜色样式的 span 和 mark 标签
 * 这些标签在 Markdown 中会被原样保留（markdown-it 配置了 html: true）
 * @param html HTML 内容
 * @returns 处理后的 HTML 和占位符映射
 */
export const protectStyledTags = (html: string): StyledTagsProtection => {
  const placeholders = new Map<string, string>()
  let index = 0

  let result = html

  // 保护带 color 样式的 span 标签（字体颜色）
  // 匹配 <span style="...color...">内容</span>
  result = result.replace(
    /<span[^>]*style="[^"]*color\s*:[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => {
      const placeholder = `___STYLED_SPAN_${index++}___`
      placeholders.set(placeholder, match)
      return placeholder
    }
  )

  // 保护带 background-color 样式的 mark 标签（背景高亮）
  // 匹配 <mark style="...background-color...">内容</mark> 或 <mark data-color="...">内容</mark>
  result = result.replace(
    /<mark[^>]*(?:style="[^"]*background[^"]*"|data-color="[^"]*")[^>]*>[\s\S]*?<\/mark>/gi,
    (match) => {
      const placeholder = `___STYLED_MARK_${index++}___`
      placeholders.set(placeholder, match)
      return placeholder
    }
  )

  // 保护简单的 mark 标签（无样式的默认高亮）
  result = result.replace(/<mark>[\s\S]*?<\/mark>/gi, (match) => {
    const placeholder = `___STYLED_MARK_${index++}___`
    placeholders.set(placeholder, match)
    return placeholder
  })

  return { html: result, placeholders }
}

/**
 * 恢复被保护的样式标签
 * @param content 包含占位符的内容
 * @param placeholders 占位符映射
 * @returns 恢复后的内容
 */
export const restoreStyledTags = (
  content: string,
  placeholders: Map<string, string>
): string => {
  let result = content
  placeholders.forEach((original, placeholder) => {
    result = result.replace(new RegExp(placeholder, 'g'), original)
  })
  return result
}

/**
 * HTML 实体编码
 * @param text 原始文本
 * @returns 编码后的文本
 */
export const encodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * HTML 实体解码
 * @param text 编码后的文本
 * @returns 解码后的文本
 */
export const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * 创建占位符管理器
 * 用于在转换过程中保护特殊内容
 */
export const createPlaceholderManager = () => {
  const placeholders: PlaceholderItem[] = []
  let index = 0

  return {
    /**
     * 添加占位符
     * @param html 要保护的 HTML 内容
     * @returns 占位符字符串
     */
    add: (html: string): string => {
      const placeholder = `XYZPLACEHOLDER${index++}XYZ`
      placeholders.push({ placeholder, html })
      return placeholder
    },

    /**
     * 恢复所有占位符
     * @param content 包含占位符的内容
     * @returns 恢复后的内容
     */
    restore: (content: string): string => {
      let result = content
      placeholders.forEach((item) => {
        result = result.replace(item.placeholder, item.html)
      })
      return result
    },

    /**
     * 获取所有占位符
     */
    getAll: () => [...placeholders]
  }
}
