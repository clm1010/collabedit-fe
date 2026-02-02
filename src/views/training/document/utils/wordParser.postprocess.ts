import { formatPx, ptToPx } from './wordParser.shared'

/**
 * 清理 Word 导出的 HTML - 保持更好的排版
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
export const cleanWordHtml = (html: string): string => {
  // 移除多余的连续空段落（保留单个空段落用于间距）
  html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格，但保留必要的空格
  html = html.replace(/&nbsp;&nbsp;+/g, ' ')

  // 提前保留高亮/底纹信息，避免被 mso- 清理掉
  html = html.replace(/mso-highlight:\s*([^;"]+)/gi, 'background-color: $1')
  html = html.replace(/mso-shading:\s*([^;"]+)/gi, 'background-color: $1')

  // 移除 Word 特有的 mso- 样式，但保留其他有用的样式
  html = html.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')

  // 移除空的 style 属性
  html = html.replace(/style="\s*"/g, '')

  // 移除 Word 特有的 class
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, '')

  // 处理分页符 - 转换为自定义分页标记
  html = html.replace(
    /<br[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div><p>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>(.*?)<\/p>/gi,
    '<p>$1</p><div class="page-break" data-type="page-break"></div>'
  )

  // 处理图片宽度 - 限制最大宽度为编辑器可用宽度
  const MAX_IMAGE_WIDTH = 540 // 编辑器可用宽度（A4 页面 794px - 边距 240px - 一些余量）

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
      } else if (widthStr.endsWith('%')) {
        width = 0
      } else {
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

  html = html.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  return html
}

/**
 * 转换内联样式为 Tiptap 支持的格式
 */
export const convertInlineStylesToTiptap = (html: string): string => {
  html = html.replace(/mso-highlight:\s*([^;"]+)/gi, 'background-color: $1')
  html = html.replace(/background(?!-color)\s*:\s*([^;"]+)/gi, 'background-color: $1')
  html = html.replace(/(\d+(?:\.\d+)?)\s*pt/gi, (_, size) => `${ptToPx(parseFloat(size))}px`)

  html = html.replace(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/gi, (_, size) => {
    const ptSize = parseFloat(size)
    const pxSize = ptToPx(ptSize)
    return `font-size: ${formatPx(pxSize)}px`
  })

  html = html.replace(/font-size:\s*(\d+(?:\.\d+)?)\s*px/gi, (_, size) => {
    return `font-size: ${formatPx(parseFloat(size))}px`
  })

  html = html.replace(/color:\s*#([a-fA-F0-9]{6})/gi, 'color: #$1')
  html = html.replace(/color:\s*#([a-fA-F0-9]{3})/gi, 'color: #$1')

  html = html.replace(/background-color:\s*#([a-fA-F0-9]{6})/gi, 'background-color: #$1')
  html = html.replace(/background-color:\s*#([a-fA-F0-9]{3})/gi, 'background-color: #$1')
  html = html.replace(/background-color:\s*([a-fA-F0-9]{6})/gi, 'background-color: #$1')
  html = html.replace(/background-color:\s*([a-fA-F0-9]{3})/gi, 'background-color: #$1')

  html = html.replace(
    /<(span|font)([^>]*)style="([^"]*background-color:\s*#([a-fA-F0-9]{3,6})[^"]*)"([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag, before, style, bgColor, after, content) => {
      const otherStyles = style
        .split(';')
        .filter((s: string) => !s.trim().toLowerCase().startsWith('background-color'))
        .join(';')
        .trim()

      if (otherStyles) {
        return `<mark data-color="#${bgColor}" style="background-color: #${bgColor}"><${tag}${before}style="${otherStyles}"${after}>${content}</${tag}></mark>`
      }
      return `<mark data-color="#${bgColor}" style="background-color: #${bgColor}">${content}</mark>`
    }
  )

  html = html.replace(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi, (_, r, g, b) => {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = parseInt(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    return `color: ${hex}`
  })

  html = html.replace(/color:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/gi, (_, r, g, b) => {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = parseInt(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    return `color: ${hex}`
  })

  html = html.replace(/background-color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi, (_, r, g, b) => {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = parseInt(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    return `background-color: ${hex}`
  })

  html = html.replace(
    /background-color:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/gi,
    (_, r, g, b) => {
      const hex =
        '#' +
        [r, g, b]
          .map((x) => {
            const hex = parseInt(x).toString(16)
            return hex.length === 1 ? '0' + hex : hex
          })
          .join('')
      return `background-color: ${hex}`
    }
  )

  html = html.replace(/text-align:\s*(left|center|right|justify)/gi, 'text-align: $1')

  html = html.replace(/font-family:\s*([^;]+)/gi, (_, font) => {
    const normalized = font.trim().replace(/"/g, "'")
    return `font-family: ${normalized}`
  })

  const normalizeBgColor = (value: string): string => {
    const raw = value.trim()
    if (!raw) return ''
    const lowered = raw.toLowerCase()
    if (lowered === 'auto' || lowered === 'none' || lowered === 'transparent') return ''
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`
    if (/^[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase()
    }
    if (raw.startsWith('#')) {
      const hex = raw.length === 4 ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}` : raw
      return hex.toUpperCase()
    }
    const rgbMatch = raw.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i)
    if (rgbMatch) {
      const [r, g, b] = rgbMatch.slice(1).map((v) => parseInt(v, 10))
      return ('#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')).toUpperCase()
    }
    const namedMap: Record<string, string> = {
      yellow: '#FFFF00',
      green: '#00FF00',
      cyan: '#00FFFF',
      magenta: '#FF00FF',
      blue: '#0000FF',
      red: '#FF0000',
      darkblue: '#00008B',
      darkcyan: '#008B8B',
      darkgreen: '#006400',
      darkmagenta: '#8B008B',
      darkred: '#8B0000',
      darkyellow: '#808000',
      darkgray: '#A9A9A9',
      lightgray: '#D3D3D3',
      black: '#000000',
      white: '#FFFFFF'
    }
    return namedMap[lowered] || raw
  }

  html = html.replace(
    /<(span|font)([^>]*)style="([^"]*background-color:\s*[^";]+[^"]*)"([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag, before, style, after, content) => {
      const bgMatch = style.match(/background-color:\s*([^;]+)/i)
      const bgColor = bgMatch ? normalizeBgColor(bgMatch[1]) : ''
      const otherStyles = style
        .split(';')
        .filter((s: string) => !s.trim().toLowerCase().startsWith('background-color'))
        .join(';')
        .trim()

      if (!bgColor) {
        return `<${tag}${before}style="${style}"${after}>${content}</${tag}>`
      }

      if (otherStyles) {
        return `<mark data-color="${bgColor}" style="background-color: ${bgColor}"><${tag}${before}style="${otherStyles}"${after}>${content}</${tag}></mark>`
      }
      return `<mark data-color="${bgColor}" style="background-color: ${bgColor}">${content}</mark>`
    }
  )

  html = html.replace(
    /<p([^>]*)style="([^"]*background-color:\s*[^";]+[^"]*)"([^>]*)>([\s\S]*?)<\/p>/gi,
    (_match, before, style, after, content) => {
      const bgMatch = style.match(/background-color:\s*([^;]+)/i)
      const bgColor = bgMatch ? normalizeBgColor(bgMatch[1]) : ''
      const otherStyles = style
        .split(';')
        .filter((s: string) => !s.trim().toLowerCase().startsWith('background-color'))
        .join(';')
        .trim()

      if (!bgColor) {
        return `<p${before}style="${style}"${after}>${content}</p>`
      }

      const pStyleAttr = otherStyles ? ` style="${otherStyles}"` : ''
      return `<p${before}${pStyleAttr}${after}><mark data-color="${bgColor}" style="background-color: ${bgColor}">${content}</mark></p>`
    }
  )

  return html
}

/**
 * 从元素或其子元素中提取最大字体大小（px）
 */
const extractMaxFontSize = (element: Element): number => {
  let maxFontSize = 0
  const style = element.getAttribute('style') || ''

  const ptMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/i)
  if (ptMatch) maxFontSize = Math.max(maxFontSize, parseFloat(ptMatch[1]) * 1.33)

  const pxMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*px/i)
  if (pxMatch) maxFontSize = Math.max(maxFontSize, parseFloat(pxMatch[1]))

  const emMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*em/i)
  if (emMatch) maxFontSize = Math.max(maxFontSize, parseFloat(emMatch[1]) * 16)

  const remMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*rem/i)
  if (remMatch) maxFontSize = Math.max(maxFontSize, parseFloat(remMatch[1]) * 16)

  const children = element.querySelectorAll('*')
  children.forEach((child) => {
    const childStyle = child.getAttribute('style') || ''
    const childPtMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/i)
    if (childPtMatch) maxFontSize = Math.max(maxFontSize, parseFloat(childPtMatch[1]) * 1.33)
    const childPxMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*px/i)
    if (childPxMatch) maxFontSize = Math.max(maxFontSize, parseFloat(childPxMatch[1]))
    const childEmMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*em/i)
    if (childEmMatch) maxFontSize = Math.max(maxFontSize, parseFloat(childEmMatch[1]) * 16)
    const childRemMatch = childStyle.match(/font-size:\s*(\d+(?:\.\d+)?)\s*rem/i)
    if (childRemMatch) maxFontSize = Math.max(maxFontSize, parseFloat(childRemMatch[1]) * 16)
  })

  return maxFontSize
}

/**
 * 检查元素或其子元素是否加粗
 */
const checkIsBold = (element: Element): boolean => {
  const style = element.getAttribute('style') || ''
  if (
    style.includes('font-weight: bold') ||
    style.includes('font-weight:bold') ||
    style.includes('font-weight: 700') ||
    style.includes('font-weight:700') ||
    style.includes('font-weight:600') ||
    style.includes('font-weight: 600')
  ) {
    return true
  }

  if (element.querySelector('b, strong')) return true

  const children = Array.from(element.querySelectorAll('*'))
  for (const child of children) {
    const childStyle = child.getAttribute('style') || ''
    if (
      childStyle.includes('font-weight: bold') ||
      childStyle.includes('font-weight:bold') ||
      childStyle.includes('font-weight: 700') ||
      childStyle.includes('font-weight:700') ||
      childStyle.includes('font-weight:600') ||
      childStyle.includes('font-weight: 600')
    ) {
      return true
    }
  }

  return false
}

/**
 * 将大字体段落转换为标题
 * 处理 WPS 等编辑器不使用标准标题样式的情况
 */
export const convertLargeFontParagraphsToHeadings = (html: string): string => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html')
    const root = doc.getElementById('root')
    if (!root) return html

    const existingHeadings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
    console.log(`convertLargeFontParagraphsToHeadings: 已有 ${existingHeadings.length} 个标题元素`)

    const paragraphs = root.querySelectorAll('p')
    let modified = false
    let convertedCount = 0

    console.log(`convertLargeFontParagraphsToHeadings: 检查 ${paragraphs.length} 个段落`)

    paragraphs.forEach((p) => {
      const text = p.textContent?.trim() || ''
      if (!text || text.length > 100) return

      const style = p.getAttribute('style') || ''

      const isCenter =
        style.includes('text-align: center') ||
        style.includes('text-align:center') ||
        style.includes('text-align: justify')

      const fontSize = extractMaxFontSize(p)
      const isBold = checkIsBold(p)

      if (fontSize > 0 || isBold) {
        console.log(
          `段落检测: "${text.substring(0, 30)}..." fontSize=${fontSize.toFixed(1)}px, isBold=${isBold}, isCenter=${isCenter}`
        )
      }

      let headingLevel = 0
      if (fontSize >= 29) headingLevel = 1
      else if (fontSize >= 24) headingLevel = 2
      else if (fontSize >= 20 || (fontSize >= 18 && isBold)) headingLevel = 3
      else if ((fontSize >= 17 && isBold) || (fontSize >= 16 && isCenter)) headingLevel = 4
      else if (fontSize >= 15 && isBold) headingLevel = 5
      else if (fontSize >= 14 && isBold) headingLevel = 6

      if (headingLevel > 0) {
        const heading = doc.createElement(`h${headingLevel}`)
        heading.innerHTML = p.innerHTML
        const keepStyles: string[] = []
        style.split(';').forEach((s) => {
          const trimmed = s.trim()
          if (
            trimmed.startsWith('text-align:') ||
            trimmed.startsWith('color:') ||
            trimmed.startsWith('font-family:') ||
            trimmed.startsWith('font-size:') ||
            trimmed.startsWith('font-weight:')
          ) {
            keepStyles.push(trimmed)
          }
        })
        if (keepStyles.length > 0) {
          heading.setAttribute('style', keepStyles.join('; '))
        }
        p.parentNode?.replaceChild(heading, p)
        modified = true
        convertedCount++
        console.log(
          `✓ 转换段落为 h${headingLevel}: "${text.substring(0, 50)}..." (fontSize=${fontSize.toFixed(1)}px)`
        )
      }
    })

    console.log(`convertLargeFontParagraphsToHeadings: 共转换 ${convertedCount} 个段落为标题`)

    if (modified) {
      return root.innerHTML
    }
    return html
  } catch (e) {
    console.warn('convertLargeFontParagraphsToHeadings 失败:', e)
    return html
  }
}
