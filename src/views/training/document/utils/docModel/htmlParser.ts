import type {
  DocBlock,
  DocBlockquoteBlock,
  DocCodeBlock,
  DocFootnote,
  DocHeadingBlock,
  DocImageBlock,
  DocListBlock,
  DocListItem,
  DocModel,
  DocParagraphBlock,
  DocRun,
  DocTableBlock,
  DocTableCell,
  DocTableRow,
  ParagraphStyle,
  RunStyle
} from './types'
import { normalizeDocMetadata } from './model'
import type { DocMetadata } from './types'
import { normalizeColor } from '../wordParser.shared'
import { logger } from '@/views/utils/logger'

const parsePxValue = (value?: string): number | undefined => {
  if (!value) return undefined
  const raw = value.trim()
  if (!raw) return undefined
  // pt → px（1pt ≈ 1.33px）— DOCX 最常用单位
  if (raw.endsWith('pt')) {
    const pt = parseFloat(raw)
    if (Number.isNaN(pt)) return undefined
    return Math.round(pt * 1.33 * 100) / 100
  }
  if (raw.endsWith('px')) {
    const px = parseFloat(raw)
    return Number.isNaN(px) ? undefined : px
  }
  // em/rem/% 在 DOCX 中极少出现，仅记录不处理
  if (raw.endsWith('em') || raw.endsWith('rem') || raw.endsWith('%')) {
    logger.debug(`[parsePxValue] 跳过不支持的单位: ${raw}`)
    return undefined
  }
  // 无单位数值视为 px
  const num = parseFloat(raw)
  return Number.isNaN(num) ? undefined : num
}

const extractStyleMap = (styleText: string): Record<string, string> => {
  const map: Record<string, string> = {}
  styleText
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split(':')
      if (!key || rest.length === 0) return
      map[key.trim().toLowerCase()] = rest.join(':').trim()
    })
  return map
}

const parseParagraphStyle = (element: Element): ParagraphStyle | undefined => {
  const styleText = element.getAttribute('style') || ''
  if (!styleText) return undefined
  const map = extractStyleMap(styleText)
  const style: ParagraphStyle = {}
  if (map['text-align']) {
    const align = map['text-align'] as ParagraphStyle['align']
    if (['left', 'center', 'right', 'justify'].includes(align || '')) {
      style.align = align
    }
  }
  const indentLeft = parsePxValue(map['margin-left'])
  const indentRight = parsePxValue(map['margin-right'])
  const indentFirst = parsePxValue(map['text-indent'])
  const lineHeight = parsePxValue(map['line-height'])
  const spaceBefore = parsePxValue(map['margin-top'])
  const spaceAfter = parsePxValue(map['margin-bottom'])
  if (indentLeft) style.indentLeft = indentLeft
  if (indentRight) style.indentRight = indentRight
  if (indentFirst) style.indentFirstLine = indentFirst
  if (lineHeight) style.lineHeight = lineHeight
  if (spaceBefore) style.spaceBefore = spaceBefore
  if (spaceAfter) style.spaceAfter = spaceAfter
  return Object.keys(style).length ? style : undefined
}

const parseRunStyle = (element: Element): RunStyle | undefined => {
  const styleText = element.getAttribute('style') || ''
  const map = styleText ? extractStyleMap(styleText) : {}
  const style: RunStyle = {}

  const fontFamily = map['font-family']
  const fontSize = parsePxValue(map['font-size'])
  const color = map['color']
  const backgroundColor = map['background-color']

  // 清理 font-family 中所有引号，存储纯字体名（输出时由 serializer 添加 fallback）
  if (fontFamily) {
    const cleaned = fontFamily
      .split(',')[0] // 取第一个字体名（忽略 CSS fallback 链）
      .replace(/['"]/g, '')
      .trim()
    if (cleaned) style.fontFamily = cleaned
  }
  if (fontSize) style.fontSize = fontSize
  // 颜色归一化为 #RRGGBB 格式
  if (color) {
    const normalized = normalizeColor(color)
    if (normalized) style.color = normalized
  }
  if (backgroundColor) {
    const normalized = normalizeColor(backgroundColor)
    if (normalized) style.backgroundColor = normalized
  }

  const fontWeight = map['font-weight']
  if (fontWeight && (fontWeight === 'bold' || parseInt(fontWeight, 10) >= 600)) {
    style.bold = true
  }
  const fontStyle = map['font-style']
  if (fontStyle && fontStyle.toLowerCase().includes('italic')) {
    style.italic = true
  }
  const textDecoration = map['text-decoration']
  if (textDecoration) {
    if (textDecoration.includes('underline')) style.underline = true
    if (textDecoration.includes('line-through')) style.strike = true
  }
  const verticalAlign = map['vertical-align']
  if (verticalAlign === 'super') style.superscript = true
  if (verticalAlign === 'sub') style.subscript = true

  return Object.keys(style).length ? style : undefined
}

const mergeRunStyle = (
  base: RunStyle | undefined,
  next: RunStyle | undefined
): RunStyle | undefined => {
  if (!base && !next) return undefined
  return { ...(base || {}), ...(next || {}) }
}

const collectRuns = (node: Node, inheritedStyle?: RunStyle): DocRun[] => {
  const runs: DocRun[] = []
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    if (text) {
      runs.push({ text, style: inheritedStyle })
    }
    return runs
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs
  const element = node as Element
  let currentStyle = inheritedStyle

  if (element.tagName.toLowerCase() === 'br') {
    runs.push({ text: '\n', style: currentStyle })
    return runs
  }

  if (element.tagName.toLowerCase() === 'sup') {
    const footnoteId =
      element.getAttribute('data-docx-footnote') || element.getAttribute('data-footnote-id')
    if (footnoteId) {
      const id = parseInt(footnoteId, 10)
      if (!Number.isNaN(id)) {
        runs.push({ text: '', footnoteId: id, style: currentStyle })
        return runs
      }
    }
    const endnoteId =
      element.getAttribute('data-docx-endnote') || element.getAttribute('data-endnote-id')
    if (endnoteId) {
      const id = parseInt(endnoteId, 10)
      if (!Number.isNaN(id)) {
        runs.push({ text: '', endnoteId: id, style: currentStyle })
        return runs
      }
    }
  }

  if (element.tagName.toLowerCase() === 'a') {
    const href = element.getAttribute('href') || undefined
    if (href) {
      currentStyle = mergeRunStyle(currentStyle, { link: href })
      const hasInlineColor = (element.getAttribute('style') || '').includes('color')
      const childHasColor = element.querySelector('[style*="color"]')
      if (!hasInlineColor && !childHasColor && !currentStyle?.color) {
        currentStyle = mergeRunStyle(currentStyle, { color: '#0563C1' })
      }
    }
  }

  const tag = element.tagName.toLowerCase()
  const semanticStyle: RunStyle = {}
  if (tag === 'strong' || tag === 'b') semanticStyle.bold = true
  if (tag === 'em' || tag === 'i') semanticStyle.italic = true
  if (tag === 'u') semanticStyle.underline = true
  if (tag === 's' || tag === 'del') semanticStyle.strike = true
  if (tag === 'sub') semanticStyle.subscript = true
  if (
    tag === 'sup' &&
    !element.getAttribute('data-docx-footnote') &&
    !element.getAttribute('data-docx-endnote') &&
    !element.getAttribute('data-footnote-id') &&
    !element.getAttribute('data-endnote-id')
  ) {
    semanticStyle.superscript = true
  }
  if (Object.keys(semanticStyle).length) {
    currentStyle = mergeRunStyle(currentStyle, semanticStyle)
  }

  if (tag === 'mark') {
    const markStyle = parseRunStyle(element) || {}
    const markColor = element.getAttribute('data-color') || markStyle.backgroundColor
    if (markColor) markStyle.backgroundColor = markColor
    currentStyle = mergeRunStyle(currentStyle, markStyle)
  } else {
    const style = parseRunStyle(element)
    currentStyle = mergeRunStyle(currentStyle, style)
  }

  const children = Array.from(element.childNodes)
  if (children.length === 0 && element.textContent) {
    runs.push({ text: element.textContent, style: currentStyle })
    return runs
  }

  children.forEach((child) => {
    runs.push(...collectRuns(child, currentStyle))
  })
  return runs
}

const parseParagraph = (element: Element): DocParagraphBlock => {
  const runs = collectRuns(element)
  const style = parseParagraphStyle(element)
  return { type: 'paragraph', runs, style }
}

const parseParagraphWithInlineImages = (element: Element): DocBlock[] => {
  const blocks: DocBlock[] = []
  const style = parseParagraphStyle(element)
  let currentRuns: DocRun[] = []

  const flushParagraph = () => {
    if (currentRuns.length > 0) {
      blocks.push({ type: 'paragraph', runs: currentRuns, style })
      currentRuns = []
    }
  }

  const children = Array.from(element.childNodes)
  if (children.length === 0) {
    return [parseParagraph(element)]
  }

  const hasTextContent = children.some((child) => {
    if (child.nodeType === Node.TEXT_NODE) return !!child.textContent?.trim()
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase()
      if (tag !== 'img' && tag !== 'br') return !!(child as Element).textContent?.trim()
    }
    return false
  })

  const inheritParagraphAlign = (imgBlock: DocImageBlock) => {
    if (!imgBlock.style?.align && style?.align) {
      const a = style.align
      if (a === 'left' || a === 'center' || a === 'right') {
        imgBlock.style = { ...imgBlock.style, align: a }
      }
    }
  }

  const pushInlineImage = (el: Element) => {
    const rawOriginSrc = el.getAttribute('data-origin-src') || undefined
    const rawSrc = rawOriginSrc || el.getAttribute('src') || ''
    const imgStyleText = el.getAttribute('style') || ''
    const imgStyleMap = imgStyleText ? extractStyleMap(imgStyleText) : {}
    currentRuns.push({
      text: '',
      image: {
        src: cleanDataUrlWhitespace(rawSrc),
        originSrc: rawOriginSrc ? cleanDataUrlWhitespace(rawOriginSrc) : undefined,
        alt: el.getAttribute('alt') || undefined,
        width: parsePxValue(el.getAttribute('width') || undefined) || parsePxValue(imgStyleMap['width']),
        height: parsePxValue(el.getAttribute('height') || undefined) || parsePxValue(imgStyleMap['height']),
        cropTop: parseCropValue(el.getAttribute('data-crop-top')),
        cropRight: parseCropValue(el.getAttribute('data-crop-right')),
        cropBottom: parseCropValue(el.getAttribute('data-crop-bottom')),
        cropLeft: parseCropValue(el.getAttribute('data-crop-left'))
      }
    })
  }

  children.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'img') {
        const display = el.getAttribute('data-display')
        const styleText = el.getAttribute('style') || ''
        const hasInlineStyle = /display\s*:\s*inline(-block)?/i.test(styleText)

        const isSoleImage = !hasTextContent
        if (isSoleImage) {
          flushParagraph()
          const imgBlock = parseImage(el)
          inheritParagraphAlign(imgBlock)
          blocks.push(imgBlock)
        } else if (display === 'inline' || hasInlineStyle || display !== 'block') {
          pushInlineImage(el)
        } else {
          flushParagraph()
          const imgBlock = parseImage(el)
          inheritParagraphAlign(imgBlock)
          blocks.push(imgBlock)
        }
        return
      }
    }
    currentRuns.push(...collectRuns(child, undefined))
  })

  flushParagraph()

  if (blocks.length === 0) {
    return [parseParagraph(element)]
  }

  return blocks
}

const parseHeading = (element: Element): DocHeadingBlock => {
  const runs = collectRuns(element)
  const style = parseParagraphStyle(element)
  return { type: 'heading', level: parseHeadingLevel(element.tagName), runs, style }
}

const parseHeadingLevel = (tagName: string): 1 | 2 | 3 | 4 | 5 | 6 => {
  const level = parseInt(tagName.replace(/[^0-9]/g, ''), 10)
  if (level >= 1 && level <= 6) return level as 1 | 2 | 3 | 4 | 5 | 6
  return 1
}

const parseList = (element: Element): DocListBlock => {
  const tag = element.tagName.toLowerCase()
  const isTaskList = element.getAttribute('data-type') === 'taskList'
  const kind: DocListBlock['kind'] = isTaskList ? 'task' : tag === 'ol' ? 'ordered' : 'bullet'
  const items: DocListItem[] = []
  const liNodes = Array.from(element.children).filter((node) => node.tagName.toLowerCase() === 'li')
  liNodes.forEach((li) => {
    const checkedAttr = li.getAttribute('data-checked')
    const checked = checkedAttr === 'true'
    const blocks = parseBlocksFromContainer(li)
    items.push({ blocks, checked: kind === 'task' ? checked : undefined })
  })
  return { type: 'list', kind, items }
}

const parseBlockquote = (element: Element): DocBlockquoteBlock => {
  return { type: 'blockquote', blocks: parseBlocksFromContainer(element) }
}

const parseCodeBlock = (element: Element): DocCodeBlock => {
  const codeEl = element.tagName.toLowerCase() === 'code' ? element : element.querySelector('code')
  const text = codeEl?.textContent || element.textContent || ''
  const language =
    codeEl?.getAttribute('data-language') || codeEl?.getAttribute('class') || undefined
  return { type: 'code', text, language }
}

/** 清洗 data URL 中 base64 部分的空白字符（第三方库生成的 base64 可能含换行） */
const cleanDataUrlWhitespace = (url: string): string => {
  if (!url || !url.startsWith('data:')) return url
  const commaIdx = url.indexOf(',')
  if (commaIdx === -1) return url
  const prefix = url.substring(0, commaIdx + 1) // "data:image/png;base64,"
  const base64 = url.substring(commaIdx + 1)
  return prefix + base64.replace(/[\s\r\n\t]+/g, '')
}

const parseCropValue = (raw: string | null): number | undefined => {
  if (!raw) return undefined
  const v = parseFloat(raw)
  return !isNaN(v) && v > 0 ? v : undefined
}

const parseImage = (element: Element): DocImageBlock => {
  const rawOriginSrc = element.getAttribute('data-origin-src') || undefined
  const rawSrc = rawOriginSrc || element.getAttribute('src') || ''
  // 清洗 base64 空白 — 覆盖所有图片来源（docx-preview / docx4js / mammoth / ooxml）
  const src = cleanDataUrlWhitespace(rawSrc)
  const originSrc = rawOriginSrc ? cleanDataUrlWhitespace(rawOriginSrc) : undefined
  const alt = element.getAttribute('alt') || undefined
  const styleText = element.getAttribute('style') || ''
  const styleMap = styleText ? extractStyleMap(styleText) : {}
  const width =
    parsePxValue(element.getAttribute('width') || undefined) || parsePxValue(styleMap['width'])
  const height =
    parsePxValue(element.getAttribute('height') || undefined) || parsePxValue(styleMap['height'])
  const normalizeAlign = (value?: string): 'left' | 'center' | 'right' | undefined => {
    if (!value) return undefined
    if (value === 'left' || value === 'center' || value === 'right') return value
    return undefined
  }
  const dataAlign = normalizeAlign(element.getAttribute('data-align') || undefined)
  const alignValue = dataAlign || normalizeAlign(styleMap['text-align'])
  const marginLeft = parsePxValue(styleMap['margin-left'])
  const marginRight = parsePxValue(styleMap['margin-right'])
  const marginTop = parsePxValue(styleMap['margin-top'])
  const marginBottom = parsePxValue(styleMap['margin-bottom'])
  const style =
    alignValue || marginLeft || marginRight || marginTop || marginBottom
      ? {
          align: alignValue,
          marginLeft,
          marginRight,
          marginTop,
          marginBottom
        }
      : undefined
  return { type: 'image', src, originSrc, alt, width, height, style,
    cropTop: parseCropValue(element.getAttribute('data-crop-top')),
    cropRight: parseCropValue(element.getAttribute('data-crop-right')),
    cropBottom: parseCropValue(element.getAttribute('data-crop-bottom')),
    cropLeft: parseCropValue(element.getAttribute('data-crop-left'))
  }
}

const parseTable = (element: Element): DocTableBlock => {
  const styleText = element.getAttribute('style') || ''
  const styleMap = styleText ? extractStyleMap(styleText) : {}
  const dataWidth = parsePxValue(element.getAttribute('data-table-width') || undefined)
  const tableWidth = dataWidth || parsePxValue(styleMap['width']) || undefined
  const minWidth = parsePxValue(styleMap['min-width'])
  const colgroup = element.querySelector('colgroup')
  const CELL_MIN_WIDTH = 25
  const rawColWidths = colgroup
    ? Array.from(colgroup.querySelectorAll('col'))
        .map((col) => {
          const colStyle = col.getAttribute('style') || ''
          const colMap = colStyle ? extractStyleMap(colStyle) : {}
          const width = parsePxValue(col.getAttribute('width') || undefined)
          return width
            || parsePxValue(colMap['width'])
            || parsePxValue(colMap['min-width'])
            || 0
        })
    : undefined
  let colWidths: number[] | undefined = rawColWidths?.length && rawColWidths.some((w) => w > CELL_MIN_WIDTH)
    ? rawColWidths
    : undefined
  const rows: DocTableRow[] = []
  const trNodes = Array.from(
    element.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr')
  )
  if (!colWidths && trNodes.length > 0) {
    const firstRow = trNodes[0]
    const tdWidths: number[] = []
    let hasAny = false
    Array.from(firstRow.querySelectorAll(':scope > td, :scope > th')).forEach((cell) => {
      const cw = cell.getAttribute('colwidth')
      if (cw) {
        hasAny = true
        cw.split(',').forEach(v => tdWidths.push(parseInt(v, 10) || 0))
      } else {
        const cs = parseInt(cell.getAttribute('colspan') || '1', 10)
        for (let i = 0; i < cs; i++) tdWidths.push(0)
      }
    })
    if (hasAny && tdWidths.some(w => w > CELL_MIN_WIDTH)) {
      colWidths = tdWidths
    }
  }
  trNodes.forEach((tr) => {
    const trStyle = (tr as HTMLElement).getAttribute('style') || ''
    const trMap = trStyle ? extractStyleMap(trStyle) : {}
    const rowHeight = parsePxValue(trMap['height'])
    const cells: DocTableCell[] = []
    Array.from(tr.children).forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return
      if (!['TD', 'TH'].includes(cell.tagName)) return
      const colspan = parseInt(cell.getAttribute('colspan') || '', 10)
      const rowspan = parseInt(cell.getAttribute('rowspan') || '', 10)
      const cellStyleText = cell.getAttribute('style') || ''
      const cellStyleMap = cellStyleText ? extractStyleMap(cellStyleText) : {}
      const blocks = parseBlocksFromContainer(cell)
      cells.push({
        blocks,
        colspan: Number.isNaN(colspan) ? undefined : colspan,
        rowspan: Number.isNaN(rowspan) ? undefined : rowspan,
        backgroundColor: cellStyleMap['background-color'] ? normalizeColor(cellStyleMap['background-color']) || undefined : undefined,
        textAlign: cellStyleMap['text-align'] || undefined,
        verticalAlign: cellStyleMap['vertical-align'] || undefined
      })
    })
    if (cells.length > 0) rows.push({ cells, height: rowHeight })
  })
  return { type: 'table', rows, colWidths, tableWidth, minWidth }
}

const parseBlocksFromContainer = (container: Element): DocBlock[] => {
  const blocks: DocBlock[] = []
  const children = Array.from(container.childNodes)
  children.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'p') {
        const hasImg = el.querySelector('img')
        if (hasImg) {
          blocks.push(...parseParagraphWithInlineImages(el))
        } else {
          blocks.push(parseParagraph(el))
        }
      } else if (
        tag === 'h1' ||
        tag === 'h2' ||
        tag === 'h3' ||
        tag === 'h4' ||
        tag === 'h5' ||
        tag === 'h6'
      ) {
        blocks.push(parseHeading(el))
      } else if (tag === 'ul' || tag === 'ol') {
        blocks.push(parseList(el))
      } else if (tag === 'blockquote') {
        blocks.push(parseBlockquote(el))
      } else if (tag === 'pre') {
        blocks.push(parseCodeBlock(el))
      } else if (tag === 'img') {
        blocks.push(parseImage(el))
      } else if (tag === 'table') {
        blocks.push(parseTable(el))
      } else if (tag === 'hr' && el.getAttribute('data-page-break') === 'true') {
        blocks.push({ type: 'pageBreak' })
      } else if (
        ['div', 'section', 'article', 'figure', 'span', 'header', 'footer'].includes(tag)
      ) {
        blocks.push(...parseBlocksFromContainer(el))
      } else if (el.textContent && el.textContent.trim()) {
        blocks.push(parseParagraph(el))
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) {
        blocks.push({ type: 'paragraph', runs: [{ text }] })
      }
    }
  })
  return blocks
}

export const parseHtmlToDocModel = (html: string, metadata: DocMetadata): DocModel => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="doc-model-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('doc-model-root')
  const footnotes: DocFootnote[] = []
  const endnotes: DocFootnote[] = []

  if (root) {
    root.querySelectorAll('aside[data-docx="footnote"]').forEach((el) => {
      const idAttr = el.getAttribute('data-id')
      const id = idAttr ? parseInt(idAttr, 10) : undefined
      footnotes.push({ id, blocks: parseBlocksFromContainer(el) })
      el.remove()
    })
    root.querySelectorAll('aside[data-docx="endnote"]').forEach((el) => {
      const idAttr = el.getAttribute('data-id')
      const id = idAttr ? parseInt(idAttr, 10) : undefined
      endnotes.push({ id, blocks: parseBlocksFromContainer(el) })
      el.remove()
    })
  }
  const headerBlocks = root
    ? Array.from(root.querySelectorAll('header[data-docx="header"]')).flatMap((el) =>
        parseBlocksFromContainer(el)
      )
    : []
  const footerBlocks = root
    ? Array.from(root.querySelectorAll('footer[data-docx="footer"]')).flatMap((el) =>
        parseBlocksFromContainer(el)
      )
    : []
  if (root) {
    root
      .querySelectorAll('header[data-docx="header"], footer[data-docx="footer"]')
      .forEach((el) => el.remove())
  }
  const blocks = root ? parseBlocksFromContainer(root) : []

  return {
    blocks,
    headers: headerBlocks.length ? [{ blocks: headerBlocks }] : undefined,
    footers: footerBlocks.length ? [{ blocks: footerBlocks }] : undefined,
    footnotes: footnotes.length ? footnotes : undefined,
    endnotes: endnotes.length ? endnotes : undefined,
    metadata: normalizeDocMetadata(metadata)
  }
}
