export interface StyledTagsProtection {
  html: string
  placeholders: Map<string, string>
}

export interface PlaceholderItem {
  placeholder: string
  html: string
}

/** 保护带颜色样式的 span 和 mark 标签，在 Markdown 中原样保留 */
export const protectStyledTags = (html: string): StyledTagsProtection => {
  const placeholders = new Map<string, string>()
  let index = 0

  let result = html

  result = result.replace(
    /<span[^>]*style="[^"]*color\s*:[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => {
      const placeholder = `___STYLED_SPAN_${index++}___`
      placeholders.set(placeholder, match)
      return placeholder
    }
  )

  result = result.replace(
    /<mark[^>]*(?:style="[^"]*background[^"]*"|data-color="[^"]*")[^>]*>[\s\S]*?<\/mark>/gi,
    (match) => {
      const placeholder = `___STYLED_MARK_${index++}___`
      placeholders.set(placeholder, match)
      return placeholder
    }
  )

  result = result.replace(/<mark>[\s\S]*?<\/mark>/gi, (match) => {
    const placeholder = `___STYLED_MARK_${index++}___`
    placeholders.set(placeholder, match)
    return placeholder
  })

  return { html: result, placeholders }
}

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

export const encodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export const createPlaceholderManager = () => {
  const placeholders: PlaceholderItem[] = []
  let index = 0

  return {
    add: (html: string): string => {
      const placeholder = `XYZPLACEHOLDER${index++}XYZ`
      placeholders.push({ placeholder, html })
      return placeholder
    },

    restore: (content: string): string => {
      let result = content
      placeholders.forEach((item) => {
        result = result.replace(item.placeholder, item.html)
      })
      return result
    },

    getAll: () => [...placeholders]
  }
}
