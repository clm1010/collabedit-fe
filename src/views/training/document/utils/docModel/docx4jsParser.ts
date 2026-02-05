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

const parseTableFromTree = (node: DocxTreeNode): DocTableBlock => {
  const rows: DocTableRow[] = []
  const children = node.children || []
  children.forEach((child) => {
    if (!child || typeof child !== 'object') return
    const rowNode = child as DocxTreeNode
    if (rowNode.type.toLowerCase() !== 'tr') return
    const cells: DocTableCell[] = []
    ;(rowNode.children || []).forEach((cellChild) => {
      if (!cellChild || typeof cellChild !== 'object') return
      const cellNode = cellChild as DocxTreeNode
      const tag = cellNode.type.toLowerCase()
      if (tag !== 'td' && tag !== 'th') return
      cells.push({
        blocks: parseBlocksFromTree(cellNode.children || []),
        colspan: cellNode.props?.colspan ? parseInt(cellNode.props.colspan, 10) : undefined,
        rowspan: cellNode.props?.rowspan ? parseInt(cellNode.props.rowspan, 10) : undefined
      })
    })
    rows.push({ cells })
  })
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
    src: String(props.src || ''),
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
    if (tag === 'p') blocks.push(parseParagraphFromTree(element))
    else if (/^h[1-6]$/.test(tag)) blocks.push(parseHeadingFromTree(element))
    else if (tag === 'ul' || tag === 'ol') blocks.push(parseListFromTree(element))
    else if (tag === 'blockquote') blocks.push(parseBlockquoteFromTree(element))
    else if (tag === 'pre' || tag === 'code') blocks.push(parseCodeFromTree(element))
    else if (tag === 'table') blocks.push(parseTableFromTree(element))
    else if (tag === 'img') blocks.push(parseImageFromTree(element))
    else if (tag === 'hr') blocks.push({ type: 'pageBreak' })
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
