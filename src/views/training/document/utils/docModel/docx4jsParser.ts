import type { ParseProgressCallback } from '../wordParser/types'
import { Buffer } from 'buffer'
import type {
  DocBlock,
  DocBlockquoteBlock,
  DocCodeBlock,
  DocHeadingBlock,
  DocImageBlock,
  DocListBlock,
  DocModel,
  DocParagraphBlock,
  DocRun,
  DocTableBlock,
  DocTableCell,
  DocTableRow,
  DocMetadata,
  ParagraphStyle,
  RunStyle
} from './types'
import { normalizeDocMetadata } from './model'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ensureBufferPolyfill = () => {
  const globalBuffer = (globalThis as any).Buffer
  if (!globalBuffer) {
    ;(globalThis as any).Buffer = Buffer
  }
}

const voidTags = new Set(['br', 'img', 'hr', 'input'])

const escapeAttr = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const normalizeChildren = (children: any): string =>
  Array.isArray(children) ? children.join('') : children ? String(children) : ''

const styleToText = (style: any): string => {
  if (!style) return ''
  if (typeof style === 'string') return style
  if (typeof style !== 'object') return ''
  return Object.entries(style)
    .map(([key, val]) => {
      if (val === undefined || val === null || val === '') return ''
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      return `${cssKey}: ${String(val)}`
    })
    .filter(Boolean)
    .join('; ')
}

const attrsToText = (props: any): string => {
  if (!props) return ''
  const attrs: string[] = []
  Object.entries(props).forEach(([key, val]) => {
    if (val === undefined || val === null || val === false) return
    if (key === 'style') {
      const styleText = styleToText(val)
      if (styleText) attrs.push(`style="${escapeAttr(styleText)}"`)
      return
    }
    if (key === 'className') {
      attrs.push(`class="${escapeAttr(String(val))}"`)
      return
    }
    if (key.startsWith('on')) return
    attrs.push(`${key}="${escapeAttr(String(val))}"`)
  })
  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

const createHtmlElement = (type: string, props: any, children: any): string => {
  const tag = String(type).toLowerCase()

  if (tag === 'picture' || tag === 'drawing.inline' || tag === 'drawing.anchor') {
    let picProps = props || {}
    if (tag !== 'picture') {
      const childHtml = normalizeChildren(children)
      const imgMatch = childHtml.match(/<img\s[^>]*\/>/)
      if (imgMatch) return imgMatch[0]
      picProps = {}
    }
    const blip = picProps?.blipFill?.blip
    const src =
      typeof blip === 'object' && blip?.url
        ? String(blip.url)
        : typeof blip === 'string'
          ? blip
          : picProps?.src || ''
    if (src) {
      const attrs: string[] = [`src="${escapeAttr(String(src))}"`]
      if (picProps.width) attrs.push(`width="${picProps.width}"`)
      if (picProps.height) attrs.push(`height="${picProps.height}"`)
      const isInline = tag === 'drawing.inline'
      attrs.push(`data-display="${isInline ? 'inline' : 'block'}"`)
      if (isInline) {
        attrs.push('style="display: inline-block; vertical-align: bottom; max-width: 100%;"')
      } else {
        attrs.push('style="display: block; max-width: 100%; height: auto;"')
      }
      return `<img ${attrs.join(' ')} />`
    }
  }

  const attrText = attrsToText(props)
  if (voidTags.has(tag)) {
    return `<${tag}${attrText} />`
  }
  const childText = normalizeChildren(children)
  return `<${tag}${attrText}>${childText}</${tag}>`
}

type DocxTreeNode = {
  type: string
  props?: Record<string, any>
  children?: DocxTreeChild[]
}
type DocxTreeChild = DocxTreeNode | string | number | null | undefined

const normalizeTreeChildren = (children: any): DocxTreeChild[] => {
  if (Array.isArray(children)) return children as DocxTreeChild[]
  if (children === undefined || children === null) return []
  return [children as DocxTreeChild]
}

const createTreeElement = (type: string, props: any, children: any): DocxTreeNode => {
  return {
    type: String(type),
    props: props || {},
    children: normalizeTreeChildren(children)
  }
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

const parsePxValue = (value?: string): number | undefined => {
  if (!value) return undefined
  const raw = String(value).trim()
  if (!raw) return undefined
  if (raw.endsWith('pt')) {
    const pt = parseFloat(raw)
    if (Number.isNaN(pt)) return undefined
    return Math.round(pt * 1.33 * 100) / 100
  }
  if (raw.endsWith('px')) {
    const px = parseFloat(raw)
    return Number.isNaN(px) ? undefined : px
  }
  const num = parseFloat(raw)
  return Number.isNaN(num) ? undefined : num
}

const findPictureInChildren = (node: DocxTreeNode): DocxTreeNode | null => {
  for (const child of node.children || []) {
    if (!child || typeof child !== 'object') continue
    const el = child as DocxTreeNode
    if (el.type?.toLowerCase() === 'picture') return el
    const found = findPictureInChildren(el)
    if (found) return found
  }
  return null
}

const extractSrcFromPictureProps = (picProps: Record<string, any>): string => {
  const blip = picProps?.blipFill?.blip
  if (blip) {
    if (typeof blip === 'string') return blip
    if (typeof blip === 'object' && blip.url) return String(blip.url)
  }
  if (picProps?.src) return String(picProps.src)
  return ''
}

const extractImageFromDrawingNode = (
  drawingNode: DocxTreeNode,
  pictureNode: DocxTreeNode | null
): { src: string; width?: number; height?: number } | null => {
  const picProps = pictureNode?.props || {}
  const drawProps = drawingNode.props || {}
  const src = extractSrcFromPictureProps(picProps)
  if (!src) return null
  const extent = drawProps.extent
  const width = extent?.width || picProps.width || undefined
  const height = extent?.height || picProps.height || undefined
  return { src, width, height }
}

const parseParagraphStyleFromProps = (props?: Record<string, any>): ParagraphStyle | undefined => {
  if (!props) return undefined
  const styleValue = props.style
  let map: Record<string, string> = {}
  if (typeof styleValue === 'string') {
    map = extractStyleMap(styleValue)
  } else if (styleValue && typeof styleValue === 'object') {
    Object.entries(styleValue).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      map[cssKey] = String(val)
    })
  }

  const style: ParagraphStyle = {}
  const align =
    map['text-align'] ||
    (props.align ? String(props.align) : '') ||
    (props.textAlign ? String(props.textAlign) : '')
  if (align) style.align = align as ParagraphStyle['align']
  const toPx = (value?: string): number | undefined => {
    if (!value) return undefined
    const raw = value.trim()
    if (!raw) return undefined
    if (raw.endsWith('pt')) return Math.round(parseFloat(raw) * 1.33 * 100) / 100
    if (raw.endsWith('px')) return parseFloat(raw)
    const num = parseFloat(raw)
    return Number.isNaN(num) ? undefined : num
  }
  const indentLeft = toPx(map['margin-left'])
  const indentRight = toPx(map['margin-right'])
  const indentFirst = toPx(map['text-indent'])
  const lineHeight = toPx(map['line-height'])
  const spaceBefore = toPx(map['margin-top'])
  const spaceAfter = toPx(map['margin-bottom'])
  if (indentLeft) style.indentLeft = indentLeft
  if (indentRight) style.indentRight = indentRight
  if (indentFirst) style.indentFirstLine = indentFirst
  if (lineHeight) style.lineHeight = lineHeight
  if (spaceBefore) style.spaceBefore = spaceBefore
  if (spaceAfter) style.spaceAfter = spaceAfter
  return Object.keys(style).length ? style : undefined
}

const parseRunStyleFromProps = (props?: Record<string, any>): RunStyle | undefined => {
  if (!props) return undefined
  const styleValue = props.style
  let map: Record<string, string> = {}
  if (typeof styleValue === 'string') {
    map = extractStyleMap(styleValue)
  } else if (styleValue && typeof styleValue === 'object') {
    Object.entries(styleValue).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      map[cssKey] = String(val)
    })
  }

  const style: RunStyle = {}
  if (map['font-family']) style.fontFamily = map['font-family']
  if (map['font-size']) style.fontSize = parseFloat(map['font-size'])
  if (map['color']) style.color = map['color']
  if (map['background-color']) style.backgroundColor = map['background-color']
  if (map['font-weight'] && parseInt(map['font-weight'], 10) >= 600) style.bold = true
  if (map['font-style']?.includes('italic')) style.italic = true
  if (map['text-decoration']?.includes('underline')) style.underline = true
  if (map['text-decoration']?.includes('line-through')) style.strike = true
  if (map['vertical-align'] === 'super') style.superscript = true
  if (map['vertical-align'] === 'sub') style.subscript = true
  if (props.bold || props.b) style.bold = true
  if (props.italic || props.i) style.italic = true
  if (props.underline || props.u) style.underline = true
  if (props.strike || props.s) style.strike = true
  if (props.superscript) style.superscript = true
  if (props.subscript) style.subscript = true
  if (props.href) style.link = String(props.href)
  return Object.keys(style).length ? style : undefined
}

const mergeRunStyle = (base?: RunStyle, extra?: RunStyle): RunStyle | undefined => {
  if (!base && !extra) return undefined
  return { ...(base || {}), ...(extra || {}) }
}

const extractStyleFromRPr = (rPrNode: DocxTreeNode): RunStyle | undefined => {
  const style: RunStyle = {}
  const propsStyle = parseRunStyleFromProps(rPrNode.props)
  if (propsStyle) Object.assign(style, propsStyle)

  for (const child of rPrNode.children || []) {
    if (!child || typeof child !== 'object') continue
    const el = child as DocxTreeNode
    const childTag = el.type?.toLowerCase()
    if (!childTag) continue

    if (childTag === 'b' || childTag === 'bold') style.bold = true
    else if (childTag === 'i' || childTag === 'italic') style.italic = true
    else if (childTag === 'u' || childTag === 'underline') style.underline = true
    else if (childTag === 'strike' || childTag === 's') style.strike = true
    else if (childTag === 'vertalign' || childTag === 'verticalalign') {
      const val = el.props?.val || el.props?.['w:val']
      if (val === 'superscript') style.superscript = true
      if (val === 'subscript') style.subscript = true
    } else if (childTag === 'color') {
      const val = el.props?.val || el.props?.['w:val'] || el.props?.color
      if (val && val !== 'auto') {
        style.color = String(val).startsWith('#') ? String(val) : `#${val}`
      }
    } else if (childTag === 'sz' || childTag === 'szcs') {
      const val = el.props?.val || el.props?.['w:val']
      if (val) {
        const halfPt = parseInt(String(val), 10)
        if (!isNaN(halfPt)) style.fontSize = halfPt / 2
      }
    } else if (childTag === 'rfonts' || childTag === 'rfont') {
      const fontName =
        el.props?.ascii || el.props?.['w:ascii'] ||
        el.props?.hAnsi || el.props?.['w:hAnsi'] ||
        el.props?.eastAsia || el.props?.['w:eastAsia']
      if (fontName) style.fontFamily = String(fontName)
    } else if (childTag === 'highlight' || childTag === 'shd') {
      const val = el.props?.val || el.props?.['w:val'] || el.props?.fill || el.props?.['w:fill']
      if (val && val !== 'auto' && val !== 'none') {
        style.backgroundColor = String(val).startsWith('#') ? String(val) : `#${val}`
      }
    }
  }

  return Object.keys(style).length ? style : undefined
}

const extractFootnoteRefId = (element: DocxTreeNode): number | undefined => {
  const candidates = [
    element.props?.['data-footnote-id'],
    element.props?.['footnote-id'],
    element.props?.['footnoteId'],
    element.props?.['w:id'],
    element.props?.['id']
  ]
  for (const value of candidates) {
    if (value === undefined || value === null) continue
    const parsed = parseInt(String(value), 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

const extractEndnoteRefId = (element: DocxTreeNode): number | undefined => {
  const candidates = [
    element.props?.['data-endnote-id'],
    element.props?.['endnote-id'],
    element.props?.['endnoteId'],
    element.props?.['w:id'],
    element.props?.['id']
  ]
  for (const value of candidates) {
    if (value === undefined || value === null) continue
    const parsed = parseInt(String(value), 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

const collectRunsFromTree = (node: DocxTreeChild, inherited?: RunStyle): DocRun[] => {
  if (node === null || node === undefined) return []
  if (typeof node === 'string' || typeof node === 'number') {
    return [{ text: String(node), style: inherited }]
  }
  const element = node as DocxTreeNode
  const tag = element.type.toLowerCase()
  if (tag === 'a' || tag === 'hyperlink') {
    const href = element.props?.href
    if (href) {
      inherited = mergeRunStyle(inherited, { link: String(href) })
    }
  }
  if (tag === 'br') {
    return [{ text: '\n', style: inherited }]
  }
  if (tag === 'img') {
    const props = element.props || {}
    const styleText = typeof props.style === 'string' ? props.style : styleToText(props.style)
    const styleMap = styleText ? extractStyleMap(styleText) : {}
    return [
      {
        text: '',
        image: {
          src: String(props.src || ''),
          alt: props.alt ? String(props.alt) : undefined,
          width: parsePxValue(props.width) || parsePxValue(styleMap['width']),
          height: parsePxValue(props.height) || parsePxValue(styleMap['height'])
        },
        style: inherited
      }
    ]
  }
  if (tag === 'drawing.inline' || tag === 'drawing.anchor') {
    const pictureNode = findPictureInChildren(element)
    const img = extractImageFromDrawingNode(element, pictureNode)
    if (img) {
      return [
        {
          text: '',
          image: { src: img.src, width: img.width, height: img.height },
          style: inherited
        }
      ]
    }
  }
  if (tag === 'picture') {
    const picProps = element.props || {}
    const src = extractSrcFromPictureProps(picProps)
    if (src) {
      return [
        {
          text: '',
          image: {
            src,
            width: picProps.width || undefined,
            height: picProps.height || undefined
          },
          style: inherited
        }
      ]
    }
  }
  if (tag === 'footnotereference' || tag === 'footnote-reference') {
    const id = extractFootnoteRefId(element)
    if (id !== undefined) return [{ text: '', footnoteId: id, style: inherited }]
  }
  if (tag === 'endnotereference' || tag === 'endnote-reference') {
    const id = extractEndnoteRefId(element)
    if (id !== undefined) return [{ text: '', endnoteId: id, style: inherited }]
  }
  let nextStyle = inherited
  if (tag === 'strong' || tag === 'b') {
    nextStyle = mergeRunStyle(nextStyle, { bold: true })
  } else if (tag === 'em' || tag === 'i') {
    nextStyle = mergeRunStyle(nextStyle, { italic: true })
  } else if (tag === 'u') {
    nextStyle = mergeRunStyle(nextStyle, { underline: true })
  } else if (tag === 's' || tag === 'del' || tag === 'strike') {
    nextStyle = mergeRunStyle(nextStyle, { strike: true })
  } else if (tag === 'sup') {
    nextStyle = mergeRunStyle(nextStyle, { superscript: true })
  } else if (tag === 'sub') {
    nextStyle = mergeRunStyle(nextStyle, { subscript: true })
  } else if (tag === 'mark') {
    const markColor =
      element.props?.['data-color'] ||
      element.props?.style?.backgroundColor ||
      (typeof element.props?.style === 'string'
        ? extractStyleMap(element.props.style)['background-color']
        : undefined)
    if (markColor) {
      nextStyle = mergeRunStyle(nextStyle, { backgroundColor: String(markColor) })
    }
  }
  nextStyle = mergeRunStyle(nextStyle, parseRunStyleFromProps(element.props))
  const children = element.children || []
  for (const child of children) {
    if (!child || typeof child !== 'object') continue
    const childTag = (child as DocxTreeNode).type?.toLowerCase()
    if (childTag === 'rpr' || childTag === 'r.rpr') {
      nextStyle = mergeRunStyle(nextStyle, extractStyleFromRPr(child as DocxTreeNode))
      break
    }
  }
  return children.flatMap((child) => collectRunsFromTree(child, nextStyle))
}

const parseParagraphFromTree = (node: DocxTreeNode): DocParagraphBlock => {
  return {
    type: 'paragraph',
    runs: collectRunsFromTree(node),
    style: parseParagraphStyleFromProps(node.props)
  }
}

const parseHeadingFromTree = (node: DocxTreeNode): DocHeadingBlock => {
  const level = parseInt(node.type.replace(/[^0-9]/g, ''), 10)
  const headingLevel = (level >= 1 && level <= 6 ? level : 1) as DocHeadingBlock['level']
  return {
    type: 'heading',
    level: headingLevel,
    runs: collectRunsFromTree(node),
    style: parseParagraphStyleFromProps(node.props)
  }
}

const parseListLevel = (node: DocxTreeNode): number => {
  const levelRaw =
    node.props?.['data-level'] ??
    node.props?.['level'] ??
    node.props?.['data-list-level'] ??
    node.props?.['data-ilvl'] ??
    node.props?.['ilvl']
  if (levelRaw !== undefined) {
    const parsed = parseInt(String(levelRaw), 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  const styleValue = node.props?.style
  const styleText = typeof styleValue === 'string' ? styleValue : ''
  const map = styleText ? extractStyleMap(styleText) : {}
  const marginLeft = map['margin-left']
  if (marginLeft) {
    const px = parseParagraphStyleFromProps({ style: `margin-left:${marginLeft}` })?.indentLeft
    if (px !== undefined) return Math.max(0, Math.round(px / 24))
  }
  return 0
}

const parseListFromTree = (node: DocxTreeNode): DocListBlock => {
  const tag = node.type.toLowerCase()
  const isTask = node.props?.['data-type'] === 'taskList'
  const kind: DocListBlock['kind'] = isTask ? 'task' : tag === 'ol' ? 'ordered' : 'bullet'
  const rootList: DocListBlock = { type: 'list', kind, items: [] }
  const listStack: Array<{ list: DocListBlock; level: number }> = [{ list: rootList, level: 0 }]
  const children = node.children || []
  children.forEach((child) => {
    if (!child || typeof child !== 'object') return
    const el = child as DocxTreeNode
    if (el.type.toLowerCase() !== 'li') return
    const checked = el.props?.['data-checked'] === 'true'
    const blocks = parseBlocksFromTree(el.children || [])
    const level = parseListLevel(el)
    while (listStack.length > 1 && level < listStack[listStack.length - 1].level) {
      listStack.pop()
    }
    if (level > listStack[listStack.length - 1].level) {
      const parentItem = listStack[listStack.length - 1].list.items.slice(-1)[0]
      if (parentItem) {
        const nestedList: DocListBlock = { type: 'list', kind, items: [] }
        parentItem.blocks.push(nestedList)
        listStack.push({ list: nestedList, level })
      }
    }
    listStack[listStack.length - 1].list.items.push({
      blocks,
      checked: kind === 'task' ? checked : undefined
    })
  })
  return rootList
}

const getCellColspan = (props: any): number | undefined => {
  const val = props?.colspan ?? props?.colSpan ?? props?.gridSpan
  return val ? parseInt(String(val), 10) || undefined : undefined
}

const getCellRowspan = (props: any): number | undefined => {
  const val = props?.rowspan ?? props?.rowSpan
  return val ? parseInt(String(val), 10) || undefined : undefined
}

const getCellStyles = (cellNode: DocxTreeNode): {
  backgroundColor?: string
  textAlign?: string
  verticalAlign?: string
} => {
  const props = cellNode.props || {}
  const raw = props.style
  const styleText = typeof raw === 'string' ? raw : styleToText(raw)
  const styleMap = styleText ? extractStyleMap(styleText) : {}
  return {
    backgroundColor: props.backgroundColor || props['background-color'] || styleMap['background-color'] || undefined,
    textAlign: props.textAlign || props['text-align'] || styleMap['text-align'] || undefined,
    verticalAlign: props.verticalAlign || props['vertical-align'] || styleMap['vertical-align'] || undefined
  }
}

const getCellVMerge = (props: any): 'restart' | 'continue' | undefined => {
  const val = props?.vMerge ?? props?.vmerge ?? props?.['v-merge']
  if (!val) return undefined
  const s = String(val).toLowerCase()
  if (s === 'restart') return 'restart'
  return 'continue'
}

const parseTableFromTree = (node: DocxTreeNode): DocTableBlock => {
  const rows: DocTableRow[] = []

  interface RawCell {
    blocks: DocBlock[]
    colspan?: number
    rowspan?: number
    backgroundColor?: string
    textAlign?: string
    verticalAlign?: string
    vMerge?: 'restart' | 'continue'
  }
  const rawRows: RawCell[][] = []

  const collectRows = (children: (DocxTreeNode | string)[]) => {
    children.forEach((child) => {
      if (!child || typeof child !== 'object') return
      const rowNode = child as DocxTreeNode
      const tag = rowNode.type.toLowerCase()
      if (tag === 'tbody' || tag === 'thead' || tag === 'tfoot') {
        collectRows(rowNode.children || [])
        return
      }
      if (tag !== 'tr') return
      const cells: RawCell[] = []
      ;(rowNode.children || []).forEach((cellChild) => {
        if (!cellChild || typeof cellChild !== 'object') return
        const cellNode = cellChild as DocxTreeNode
        const cellTag = cellNode.type.toLowerCase()
        if (cellTag !== 'td' && cellTag !== 'th') return
        const props = cellNode.props || {}
        const cellStyles = getCellStyles(cellNode)
        cells.push({
          blocks: parseBlocksFromTree(cellNode.children || []),
          colspan: getCellColspan(props),
          rowspan: getCellRowspan(props),
          ...cellStyles,
          vMerge: getCellVMerge(props)
        })
      })
      if (cells.length > 0) rawRows.push(cells)
    })
  }

  collectRows(node.children || [])

  const hasVMerge = rawRows.some(row => row.some(c => c.vMerge !== undefined))
  const hasRowspan = rawRows.some(row => row.some(c => c.rowspan && c.rowspan > 1))

  if (hasVMerge && !hasRowspan) {
    const totalCols = Math.max(...rawRows.map(row =>
      row.reduce((sum, c) => sum + (c.colspan || 1), 0)
    ), 0)

    const grid: (RawCell | null)[][] = rawRows.map(row => {
      const expanded: (RawCell | null)[] = []
      row.forEach(c => {
        const span = c.colspan || 1
        expanded.push(c)
        for (let i = 1; i < span; i++) expanded.push(null)
      })
      while (expanded.length < totalCols) expanded.push(null)
      return expanded
    })

    for (let col = 0; col < totalCols; col++) {
      let mergeStart = -1
      for (let row = 0; row < grid.length; row++) {
        const cell = grid[row][col]
        if (!cell) continue
        if (cell.vMerge === 'restart') {
          mergeStart = row
        } else if (cell.vMerge === 'continue' && mergeStart >= 0) {
          const startCell = grid[mergeStart][col]
          if (startCell) {
            startCell.rowspan = (startCell.rowspan || 1) + 1
          }
          cell.vMerge = undefined
          cell.rowspan = 0
        } else {
          mergeStart = -1
        }
      }
    }

    rawRows.forEach(rawRow => {
      const cells: DocTableCell[] = rawRow
        .filter(c => c.rowspan !== 0)
        .map(({ vMerge, ...rest }) => {
          const cell: DocTableCell = { blocks: rest.blocks }
          if (rest.colspan && rest.colspan > 1) cell.colspan = rest.colspan
          if (rest.rowspan && rest.rowspan > 1) cell.rowspan = rest.rowspan
          if (rest.backgroundColor) cell.backgroundColor = rest.backgroundColor
          if (rest.textAlign) cell.textAlign = rest.textAlign
          if (rest.verticalAlign) cell.verticalAlign = rest.verticalAlign
          return cell
        })
      if (cells.length > 0) rows.push({ cells })
    })
  } else {
    rawRows.forEach(rawRow => {
      const cells: DocTableCell[] = rawRow.map(({ vMerge, ...rest }) => {
        const cell: DocTableCell = { blocks: rest.blocks }
        if (rest.colspan && rest.colspan > 1) cell.colspan = rest.colspan
        if (rest.rowspan && rest.rowspan > 1) cell.rowspan = rest.rowspan
        if (rest.backgroundColor) cell.backgroundColor = rest.backgroundColor
        if (rest.textAlign) cell.textAlign = rest.textAlign
        if (rest.verticalAlign) cell.verticalAlign = rest.verticalAlign
        return cell
      })
      if (cells.length > 0) rows.push({ cells })
    })
  }

  return { type: 'table', rows }
}

const parseImageFromTree = (node: DocxTreeNode): DocImageBlock => {
  const props = node.props || {}
  const styleText = typeof props.style === 'string' ? props.style : styleToText(props.style)
  const styleMap = styleText ? extractStyleMap(styleText) : {}
  const width = parsePxValue(props.width) || parsePxValue(styleMap['width'])
  const height = parsePxValue(props.height) || parsePxValue(styleMap['height'])
  const normalizeAlign = (value?: string): 'left' | 'center' | 'right' | undefined => {
    if (!value) return undefined
    if (value === 'left' || value === 'center' || value === 'right') return value
    return undefined
  }
  const dataAlign = normalizeAlign(String(props['data-align'] || ''))
  const alignValue = dataAlign || normalizeAlign(styleMap['text-align'])
  const style = alignValue ? { align: alignValue } : undefined
  return {
    type: 'image',
    src: extractSrcFromPictureProps(props) || String(props.src || ''),
    alt: props.alt ? String(props.alt) : undefined,
    width,
    height,
    style
  }
}

const parseBlockquoteFromTree = (node: DocxTreeNode): DocBlockquoteBlock => {
  return {
    type: 'blockquote',
    blocks: parseBlocksFromTree(node.children || [])
  }
}

const parseCodeFromTree = (node: DocxTreeNode): DocCodeBlock => {
  const text = collectRunsFromTree(node)
    .map((run) => run.text)
    .join('')
  return {
    type: 'code',
    text
  }
}

const parseBlocksFromTree = (nodes: DocxTreeChild[]): DocBlock[] => {
  const blocks: DocBlock[] = []
  nodes.forEach((child) => {
    if (child === null || child === undefined) return
    if (typeof child === 'string' || typeof child === 'number') {
      if (String(child).trim()) {
        blocks.push({ type: 'paragraph', runs: [{ text: String(child) }] })
      }
      return
    }
    const element = child as DocxTreeNode
    const tag = element.type.toLowerCase()
    if (tag === 'p') {
      const para = parseParagraphFromTree(element)
      const imgRuns = para.runs.filter(r => r.image)
      const textRuns = para.runs.filter(r => r.text?.trim())
      if (imgRuns.length === 1 && textRuns.length === 0) {
        const img = imgRuns[0].image!
        blocks.push({
          type: 'image',
          src: img.src,
          originSrc: img.originSrc,
          alt: img.alt,
          width: img.width,
          height: img.height,
          style: para.style?.align && para.style.align !== 'justify'
            ? { align: para.style.align as 'left' | 'center' | 'right' }
            : undefined
        })
      } else {
        blocks.push(para)
      }
    }
    else if (/^h[1-6]$/.test(tag)) blocks.push(parseHeadingFromTree(element))
    else if (tag === 'ul' || tag === 'ol') blocks.push(parseListFromTree(element))
    else if (tag === 'blockquote') blocks.push(parseBlockquoteFromTree(element))
    else if (tag === 'pre' || tag === 'code') blocks.push(parseCodeFromTree(element))
    else if (tag === 'table') blocks.push(parseTableFromTree(element))
    else if (tag === 'img') blocks.push(parseImageFromTree(element))
    else if (tag === 'drawing.anchor' || tag === 'drawing.inline') {
      const pictureNode = findPictureInChildren(element)
      const img = extractImageFromDrawingNode(element, pictureNode)
      if (img)
        blocks.push({
          type: 'image',
          src: img.src,
          width: img.width,
          height: img.height
        })
    } else if (tag === 'picture') {
      const picProps = element.props || {}
      const src = extractSrcFromPictureProps(picProps)
      if (src)
        blocks.push({
          type: 'image',
          src,
          width: picProps.width || undefined,
          height: picProps.height || undefined
        })
    } else if (tag === 'hr') blocks.push({ type: 'pageBreak' })
    else if (element.children?.length) blocks.push(...parseBlocksFromTree(element.children))
  })
  return blocks
}

const parseFootnoteId = (node: DocxTreeNode): number | undefined => {
  const idRaw = node.props?.id ?? node.props?.['w:id'] ?? node.props?.['data-id']
  if (idRaw === undefined) return undefined
  const parsed = parseInt(String(idRaw), 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export const parseDocxWithDocx4jsToDocModel = async (
  arrayBuffer: ArrayBuffer,
  metadata: DocMetadata,
  onProgress?: ParseProgressCallback
): Promise<DocModel> => {
  onProgress?.(20, '正在使用 docx4js 结构化解析...')
  ensureBufferPolyfill()
  const docx4jsModule = await import('docx4js')
  const docx4js = (docx4jsModule as any).default || docx4jsModule
  const blob = new Blob([arrayBuffer], { type: DOCX_MIME })
  const docx = await docx4js.load(blob)
  const tree = docx.render(createTreeElement)
  const rootNodes = normalizeTreeChildren(tree)
  const blocks: DocBlock[] = []
  const headers: DocBlock[] = []
  const footers: DocBlock[] = []
  const footnotes: Array<{ id?: number; blocks: DocBlock[] }> = []
  const endnotes: Array<{ id?: number; blocks: DocBlock[] }> = []

  rootNodes.forEach((node) => {
    if (!node || typeof node !== 'object') {
      blocks.push(...parseBlocksFromTree([node]))
      return
    }
    const element = node as DocxTreeNode
    const tag = element.type.toLowerCase()
    if (tag === 'header') headers.push(...parseBlocksFromTree(element.children || []))
    else if (tag === 'footer') footers.push(...parseBlocksFromTree(element.children || []))
    else if (tag === 'footnote') {
      footnotes.push({
        id: parseFootnoteId(element),
        blocks: parseBlocksFromTree(element.children || [])
      })
    } else if (tag === 'endnote') {
      endnotes.push({
        id: parseFootnoteId(element),
        blocks: parseBlocksFromTree(element.children || [])
      })
    } else blocks.push(...parseBlocksFromTree([element]))
  })

  return {
    blocks,
    headers: headers.length ? [{ blocks: headers }] : undefined,
    footers: footers.length ? [{ blocks: footers }] : undefined,
    footnotes: footnotes.length ? footnotes : undefined,
    endnotes: endnotes.length ? endnotes : undefined,
    metadata: normalizeDocMetadata(metadata)
  }
}

export const renderDocxWithDocx4js = async (
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> => {
  onProgress?.(15, '正在加载 docx4js...')
  ensureBufferPolyfill()
  const docx4jsModule = await import('docx4js')
  const docx4js = (docx4jsModule as any).default || docx4jsModule
  const blob = new Blob([arrayBuffer], { type: DOCX_MIME })

  onProgress?.(25, '正在解析 DOCX 结构...')
  const docx = await docx4js.load(blob)

  onProgress?.(45, '正在渲染 HTML...')
  const html = docx.render(createHtmlElement)
  if (typeof html === 'string') return html
  return normalizeChildren(html)
}
