import type { ParseProgressCallback } from './wordParser/types'
import {
  convertInlineStylesToTiptap,
  convertLargeFontParagraphsToHeadings
} from './wordParser.postprocess'

/**
 * 使用 docx-preview 高保真解析 Word 文档
 * 优点：支持字体、颜色、大小、对齐、表格、图片、列表等几乎所有格式
 */
export async function parseWithDocxPreview(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(20, '正在初始化渲染引擎...')
  const docxPreview = await import('docx-preview')

  const container = document.createElement('div')
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;'
  document.body.appendChild(container)

  try {
    onProgress?.(40, '正在渲染文档内容...')

    await docxPreview.renderAsync(arrayBuffer, container, undefined, {
      className: 'docx-content',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: false,
      renderHeaders: false,
      renderFooters: false,
      renderFootnotes: true,
      renderEndnotes: true,
      useBase64URL: true,
      experimental: {
        renderStyle: true
      }
    } as any)

    onProgress?.(70, '正在提取 HTML 内容...')

    let html = ''
    const sections = container.querySelectorAll('section')
    if (sections.length > 0) {
      sections.forEach((section) => {
        html += section.innerHTML
      })
    } else {
      const articles = container.querySelectorAll('article')
      if (articles.length > 0) {
        articles.forEach((article) => {
          html += article.innerHTML
        })
      } else {
        html = container.innerHTML
      }
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    onProgress?.(85, '正在优化格式...')
    html = postProcessDocxPreviewHtml(html)

    if (html.length < 50) {
      console.warn('docx-preview 处理后内容过短，回退到简单清理')
      html = container.innerHTML
      html = html.replace(/<article[^>]*>|<\/article>|<section[^>]*>|<\/section>/gi, '')
      html = html.replace(/class="[^"]*docx[^"]*"/gi, '')
      html = html.trim()
    }

    onProgress?.(100, '解析完成')
    return html
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 后处理 docx-preview 输出的 HTML，适配 Tiptap 编辑器
 */
export function postProcessDocxPreviewHtml(html: string): string {
  const originalLength = html.length

  const normalizeInlineColor = (value: string): string => {
    const raw = value.trim()
    if (!raw) return ''
    const lowered = raw.toLowerCase()
    if (lowered === 'none' || lowered === 'auto' || lowered === 'transparent') return ''
    if (raw.startsWith('#')) {
      return raw.length === 4
        ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
        : raw.toUpperCase()
    }
    const rgbMatch = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (rgbMatch) {
      const [r, g, b] = rgbMatch.slice(1).map((v) => parseInt(v, 10))
      return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
    }
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`
    if (/^[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase()
    }
    return raw
  }

  const highlightClassMap: Record<string, string> = {}
  const styleBlocks: string[] = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
  styleBlocks.forEach((styleBlock) => {
    const css = styleBlock.replace(/<style[^>]*>|<\/style>/gi, '')
    const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{[^}]*background-color\s*:\s*([^;]+);?[^}]*\}/gi
    let match: RegExpExecArray | null = null
    while ((match = ruleRegex.exec(css))) {
      const className = match[1]
      const color = normalizeInlineColor(match[2])
      if (className && color) {
        highlightClassMap[className] = color
      }
    }
  })

  if (Object.keys(highlightClassMap).length > 0) {
    html = html.replace(
      /<([a-zA-Z0-9]+)([^>]*)class="([^"]+)"([^>]*)>/gi,
      (match, tag, before, classValue, after) => {
        const classes = classValue.split(/\s+/).filter(Boolean)
        const highlightColor = classes.map((cls) => highlightClassMap[cls]).find(Boolean)
        if (!highlightColor) return match

        const attrs = `${before}class="${classValue}"${after}`
        const styleMatch = attrs.match(/style="([^"]*)"/i)
        if (styleMatch) {
          const styleText = styleMatch[1]
          if (/background-color\s*:/i.test(styleText)) {
            return `<${tag}${attrs}>`
          }
          const mergedStyle = `${styleText}; background-color: ${highlightColor}`
          return `<${tag}${attrs.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)}>`
        }

        return `<${tag}${attrs} style="background-color: ${highlightColor}">`
      }
    )
  }

  html = html.replace(/<article[^>]*>/gi, '')
  html = html.replace(/<\/article>/gi, '')
  html = html.replace(/<section[^>]*>/gi, '')
  html = html.replace(/<\/section>/gi, '')

  html = html.replace(/\s*class="docx-wrapper[^"]*"/g, '')
  html = html.replace(/\s*class="docx[^"]*"/g, '')

  html = html.replace(/<table[^>]*>/g, (match) => {
    const cleanMatch = match.replace(/class="[^"]*"/g, '')
    if (cleanMatch.includes('style=')) {
      return cleanMatch.replace(
        /style="([^"]*)"/,
        'style="$1; border-collapse: collapse; width: 100%; max-width: 100%;"'
      )
    }
    return cleanMatch.replace(
      /<table/,
      '<table style="border-collapse: collapse; width: 100%; max-width: 100%;"'
    )
  })

  html = html.replace(/<td([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('style=')) {
      return match.replace(/style="([^"]*)"/, 'style="$1; border: 1px solid #ddd; padding: 8px;"')
    }
    return `<td${attrs} style="border: 1px solid #ddd; padding: 8px;">`
  })
  html = html.replace(/<th([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('style=')) {
      return match.replace(
        /style="([^"]*)"/,
        'style="$1; border: 1px solid #ddd; padding: 8px; background: #f5f5f5;"'
      )
    }
    return `<th${attrs} style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">`
  })

  html = html.replace(/<img([^>]*)>/g, (match, attrs) => {
    if (!attrs.includes('max-width')) {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, 'style="$1; max-width: 100%; height: auto;"')
      }
      return `<img${attrs} style="max-width: 100%; height: auto;">`
    }
    return match
  })

  html = convertInlineStylesToTiptap(html)

  html = html.replace(/<h([1-6])([^>]*)style="([^"]*)"/gi, (_match, level, attrs, style) => {
    let finalStyle = style.trim()
    if (!/font-weight\s*:/i.test(finalStyle)) {
      const fontWeight = level <= 2 ? 'font-weight: 700' : 'font-weight: 600'
      finalStyle = finalStyle ? `${finalStyle}; ${fontWeight}` : fontWeight
    }

    if (finalStyle) {
      return `<h${level}${attrs}style="${finalStyle}">`
    }
    return `<h${level}${attrs}>`
  })

  html = html.replace(/<h([1-6])([^>]*)(?<!style=)>/gi, (match, level, attrs) => {
    if (!attrs.includes('style=')) {
      const fontWeight = level <= 2 ? 'font-weight: 700' : 'font-weight: 600'
      return `<h${level}${attrs} style="${fontWeight}">`
    }
    return match
  })

  html = convertLargeFontParagraphsToHeadings(html)

  html = html.replace(/\s+data-[^=]+="[^"]*"/g, '')

  html = html.trim()
  html = html.replace(/^(\s*<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>\s*)+/gi, '')
  html = html.replace(/^\s+/, '')
  html = html.replace(/(<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>\s*){2,}$/gi, '<p><br></p>')
  html = html.replace(/(<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>\s*){2,}/gi, '<p><br></p>')

  html = html.replace(/<span[^>]*>\s*<\/span>/g, '')

  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border[^"]*(?:red|#[fF]{2}0{4}|#[fF]00|rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\))[^"]*"[^>]*>\s*(?:&nbsp;)*\s*<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border-bottom[^;]*(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"[^>]*>(\s*(?:&nbsp;)*\s*)<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  html = html.replace(
    /<hr([^>]*)style="[^"]*(?:border[^;]*)?(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"([^>]*)>/gi,
    '<hr$1 class="red-line" data-line-color="red"$2>'
  )

  html = html.replace(/<p>\s*<\/p>/g, '<p><br></p>')

  return html
}
