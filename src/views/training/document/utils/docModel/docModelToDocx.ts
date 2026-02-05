import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertInchesToTwip
} from 'docx'
import JSZip from 'jszip'
import type {
  DocBlock,
  DocBlockquoteBlock,
  DocCodeBlock,
  DocHeadingBlock,
  DocImageBlock,
  DocListBlock,
  DocListItem,
  DocModel,
  DocParagraphBlock,
  DocRun,
  DocTableBlock
} from './types'
import { normalizeBase64 } from '../wordParser.shared'

const pxToTwip = (px: number): number => Math.round(px * 15)

const parseColor = (color?: string): string | undefined => {
  if (!color) return undefined
  const raw = color.trim()
  if (!raw) return undefined
  if (raw.startsWith('#')) return raw.slice(1).toUpperCase()
  const rgbMatch = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.slice(1).map((v) => parseInt(v, 10))
    return [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return undefined
}

const pxToHalfPoints = (px?: number): number | undefined => {
  if (!px) return undefined
  const pt = px / 1.33
  return Math.round(pt * 2)
}

const ENDNOTE_TOKEN_PREFIX = '__ENDNOTE_REF_'
const ENDNOTE_TOKEN_SUFFIX = '__'

type ParagraphChild = TextRun | FootnoteReferenceRun | ExternalHyperlink

const mapRunToRuns = (run: DocRun): ParagraphChild[] => {
  if (run.footnoteId) {
    return [new FootnoteReferenceRun(run.footnoteId)]
  }
  if (run.endnoteId) {
    const token = `${ENDNOTE_TOKEN_PREFIX}${run.endnoteId}${ENDNOTE_TOKEN_SUFFIX}`
    return [new TextRun({ text: token })]
  }
  const options: any = { text: run.text || '' }
  const style = run.style
  if (style) {
    if (style.bold) options.bold = true
    if (style.italic) options.italics = true
    if (style.underline) options.underline = { type: UnderlineType.SINGLE }
    if (style.strike) options.strike = true
    const color = parseColor(style.color)
    if (color) options.color = color
    const bg = parseColor(style.backgroundColor)
    if (bg) {
      options.shading = {
        type: ShadingType.SOLID,
        color: bg
      }
    }
    const size = pxToHalfPoints(style.fontSize)
    if (size) options.size = size
    if (style.fontFamily) options.font = style.fontFamily
    if (style.superscript) options.superScript = true
    if (style.subscript) options.subScript = true
  }
  if (style?.link) {
    if (!style.color) {
      options.color = '0563C1' // Word 默认超链接蓝色
    }
    if (!style.underline) {
      options.underline = { type: UnderlineType.SINGLE }
    }
    return [
      new ExternalHyperlink({
        link: style.link,
        children: [new TextRun(options)]
      })
    ]
  }
  return [new TextRun(options)]
}

const paragraphAlignment = (align?: string) => {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

const paragraphSpacing = (block: DocParagraphBlock | DocHeadingBlock): any => {
  const style = block.style
  if (!style) return undefined
  const spacing: any = {}
  if (style.lineHeight) spacing.line = pxToTwip(style.lineHeight)
  if (style.spaceBefore) spacing.before = pxToTwip(style.spaceBefore)
  if (style.spaceAfter) spacing.after = pxToTwip(style.spaceAfter)
  return Object.keys(spacing).length ? spacing : undefined
}

const paragraphIndent = (block: DocParagraphBlock | DocHeadingBlock): any => {
  const style = block.style
  if (!style) return undefined
  const indent: any = {}
  if (style.indentLeft) indent.left = pxToTwip(style.indentLeft)
  if (style.indentRight) indent.right = pxToTwip(style.indentRight)
  if (style.indentFirstLine) indent.firstLine = pxToTwip(style.indentFirstLine)
  return Object.keys(indent).length ? indent : undefined
}

const createParagraph = (
  runs: DocRun[],
  options: {
    align?: string
    spacing?: any
    indent?: any
    heading?: any
    border?: any
    numbering?: any
  } = {}
): Paragraph => {
  const children = runs.length ? runs.flatMap(mapRunToRuns) : [new TextRun({ text: '' })]
  return new Paragraph({
    children,
    alignment: paragraphAlignment(options.align),
    spacing: options.spacing,
    indent: options.indent,
    heading: options.heading,
    border: options.border,
    numbering: options.numbering
  })
}

const buildParagraph = (block: DocParagraphBlock): Paragraph => {
  return createParagraph(block.runs, {
    align: block.style?.align,
    spacing: paragraphSpacing(block),
    indent: paragraphIndent(block)
  })
}

const buildHeading = (block: DocHeadingBlock): Paragraph => {
  const headingMap: Record<number, any> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6
  }
  return createParagraph(block.runs, {
    align: block.style?.align,
    spacing: paragraphSpacing(block),
    indent: paragraphIndent(block),
    heading: headingMap[block.level] || HeadingLevel.HEADING_1
  })
}

const loadImageData = async (
  src: string
): Promise<{ data: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null> => {
  if (!src) return null
  const base64Match = src.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/)
  if (base64Match) {
    const mimeType =
      base64Match[1] === 'jpeg' ? 'jpg' : (base64Match[1] as 'png' | 'jpg' | 'gif' | 'bmp')
    const base64Data = normalizeBase64(base64Match[2])
    if (!base64Data) return null
    try {
      const binary = atob(base64Data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return { data: bytes, type: mimeType }
    } catch (error) {
      console.warn('docModelToDocx: 图片 base64 解码失败，已跳过', error)
      return null
    }
  }

  try {
    const response = await fetch(src)
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || ''
    const type = contentType.includes('png')
      ? 'png'
      : contentType.includes('gif')
        ? 'gif'
        : contentType.includes('bmp')
          ? 'bmp'
          : 'jpg'
    return { data: new Uint8Array(buffer), type }
  } catch {
    return null
  }
}

const getImageDimensions = async (
  data: Uint8Array,
  type: 'png' | 'jpg' | 'gif' | 'bmp'
): Promise<{ width: number; height: number } | null> => {
  if (!data || data.length === 0) return null
  const mime = type === 'jpg' ? 'image/jpeg' : `image/${type}`
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
      img.src = url
    })
    if (!img.naturalWidth || !img.naturalHeight) return null
    return { width: img.naturalWidth, height: img.naturalHeight }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

const buildImageParagraph = async (block: DocImageBlock): Promise<Paragraph> => {
  const imageData = await loadImageData(block.src)
  if (!imageData) return new Paragraph({ children: [] })
  let width = block.width
  let height = block.height
  if (!width || !height) {
    const natural = await getImageDimensions(imageData.data, imageData.type)
    if (natural) {
      if (!width && !height) {
        width = natural.width
        height = natural.height
      } else if (width && !height) {
        height = Math.round(natural.height * (width / natural.width))
      } else if (height && !width) {
        width = Math.round(natural.width * (height / natural.height))
      }
    }
  }
  if (!width) width = 400
  if (!height) height = 300
  if (width > 600) {
    const ratio = 600 / width
    width = 600
    height = Math.round(height * ratio)
  }
  const image = new ImageRun({
    data: imageData.data,
    type: imageData.type,
    transformation: { width, height }
  })
  return new Paragraph({ children: [image] })
}

const buildBlockquote = (block: DocBlockquoteBlock): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  block.blocks.forEach((inner) => {
    if (inner.type === 'paragraph') {
      const runs = inner.runs.map((run) => {
        const nextStyle = {
          ...run.style,
          italic: run.style?.italic ?? true,
          color: run.style?.color ?? '#666666'
        }
        return { ...run, style: nextStyle }
      })
      paragraphs.push(
        createParagraph(runs, {
          align: inner.style?.align,
          spacing: paragraphSpacing(inner),
          indent: { left: convertInchesToTwip(0.5) },
          border: {
            left: {
              color: '2563EB',
              space: 10,
              style: BorderStyle.SINGLE,
              size: 24
            }
          }
        })
      )
    } else if (inner.type === 'heading') {
      paragraphs.push(
        createParagraph(inner.runs, {
          align: inner.style?.align,
          spacing: paragraphSpacing(inner),
          indent: { left: convertInchesToTwip(0.5) },
          border: {
            left: {
              color: '2563EB',
              space: 10,
              style: BorderStyle.SINGLE,
              size: 24
            }
          }
        })
      )
    }
  })
  return paragraphs
}

const buildCodeBlock = (block: DocCodeBlock): Paragraph[] => {
  const lines = (block.text || '').split('\n')
  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas'
          })
        ],
        shading: {
          type: ShadingType.SOLID,
          color: '1F2937'
        }
      })
  )
}

const listItemToParagraphs = (
  item: DocListItem,
  list: DocListBlock,
  level: number
): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  const reference = list.kind === 'ordered' ? 'ordered-list' : 'bullet-list'
  let numberingApplied = false

  const applyNumbering = (runs: DocRun[]) => {
    const numbering = { reference, level }
    const runsWithMarker =
      list.kind === 'task' ? [{ text: item.checked ? '☑ ' : '☐ ' }, ...runs] : runs
    paragraphs.push(
      createParagraph(runsWithMarker, {
        numbering
      })
    )
    numberingApplied = true
  }

  item.blocks.forEach((block) => {
    if (!numberingApplied && block.type === 'paragraph') {
      applyNumbering(block.runs)
      return
    }
    if (!numberingApplied && block.type === 'heading') {
      applyNumbering(block.runs)
      return
    }
    if (block.type === 'paragraph') paragraphs.push(buildParagraph(block))
    else if (block.type === 'heading') paragraphs.push(buildHeading(block))
    else if (block.type === 'blockquote') paragraphs.push(...buildBlockquote(block))
    else if (block.type === 'code') paragraphs.push(...buildCodeBlock(block))
    else if (block.type === 'list') paragraphs.push(...buildList(block, level + 1))
    else if (block.type === 'pageBreak')
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
  })

  return paragraphs
}

const buildList = (block: DocListBlock, level = 0): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  block.items.forEach((item) => {
    paragraphs.push(...listItemToParagraphs(item, block, level))
  })
  return paragraphs
}

const buildTable = (block: DocTableBlock): Table => {
  const rows = block.rows.map((row) => {
    let colIndex = 0
    const cells = row.cells.map((cell) => {
      const paragraphs = blocksToParagraphs(cell.blocks)
      const span = cell.colspan || 1
      let cellWidth: number | undefined
      if (block.colWidths && block.colWidths.length) {
        cellWidth = block.colWidths
          .slice(colIndex, colIndex + span)
          .reduce((sum, width) => sum + (width || 0), 0)
      }
      colIndex += span
      return new TableCell({
        children: paragraphs.length ? paragraphs : [new Paragraph({ children: [] })],
        columnSpan: cell.colspan,
        rowSpan: cell.rowspan,
        width: cellWidth ? { size: pxToTwip(cellWidth), type: WidthType.DXA } : undefined
      })
    })
    return new TableRow({ children: cells })
  })
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED
  })
}

const blocksToParagraphs = (blocks: DocBlock[]): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  blocks.forEach((block) => {
    if (block.type === 'paragraph') {
      paragraphs.push(buildParagraph(block))
    } else if (block.type === 'heading') {
      paragraphs.push(buildHeading(block))
    } else if (block.type === 'list') {
      paragraphs.push(...buildList(block))
    } else if (block.type === 'blockquote') {
      paragraphs.push(...buildBlockquote(block))
    } else if (block.type === 'code') {
      paragraphs.push(...buildCodeBlock(block))
    } else if (block.type === 'pageBreak') {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
    }
  })
  return paragraphs
}

const blocksToElements = async (blocks: DocBlock[]): Promise<(Paragraph | Table)[]> => {
  const elements: (Paragraph | Table)[] = []
  for (const block of blocks) {
    if (block.type === 'table') {
      elements.push(buildTable(block))
    } else if (block.type === 'image') {
      elements.push(await buildImageParagraph(block))
    } else if (block.type === 'paragraph') {
      elements.push(buildParagraph(block))
    } else if (block.type === 'heading') {
      elements.push(buildHeading(block))
    } else if (block.type === 'list') {
      elements.push(...buildList(block))
    } else if (block.type === 'blockquote') {
      elements.push(...buildBlockquote(block))
    } else if (block.type === 'code') {
      elements.push(...buildCodeBlock(block))
    } else if (block.type === 'pageBreak') {
      elements.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }
  return elements
}

const extractEndnoteIdsFromXml = (xml: string): number[] => {
  const ids = new Set<number>()
  const regex = new RegExp(`${ENDNOTE_TOKEN_PREFIX}(\\d+)${ENDNOTE_TOKEN_SUFFIX}`, 'g')
  let match
  while ((match = regex.exec(xml)) !== null) {
    const id = parseInt(match[1], 10)
    if (!Number.isNaN(id)) ids.add(id)
  }
  return Array.from(ids)
}

const replaceEndnoteTokens = (xml: string): string => {
  return xml.replace(
    new RegExp(`<w:t[^>]*>${ENDNOTE_TOKEN_PREFIX}(\\d+)${ENDNOTE_TOKEN_SUFFIX}<\\/w:t>`, 'g'),
    (_match, id) => `<w:endnoteReference w:id="${id}"/>`
  )
}

const escapeXmlText = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const buildParagraphPropertiesXml = (
  style?: DocParagraphBlock['style'],
  listInfo?: { numId?: string; level?: number }
): string => {
  if (!style && !listInfo) return ''
  const props: string[] = []
  if (style?.align) {
    props.push(`<w:jc w:val="${style.align}"/>`)
  }
  const indentParts: string[] = []
  const left = style?.indentLeft ? pxToTwip(style.indentLeft) : undefined
  const right = style?.indentRight ? pxToTwip(style.indentRight) : undefined
  const first = style?.indentFirstLine ? pxToTwip(style.indentFirstLine) : undefined
  if (left) indentParts.push(`w:left="${left}"`)
  if (right) indentParts.push(`w:right="${right}"`)
  if (first) indentParts.push(`w:firstLine="${first}"`)
  if (indentParts.length) props.push(`<w:ind ${indentParts.join(' ')}/>`)
  const spacingParts: string[] = []
  const before = style?.spaceBefore ? pxToTwip(style.spaceBefore) : undefined
  const after = style?.spaceAfter ? pxToTwip(style.spaceAfter) : undefined
  const line = style?.lineHeight ? pxToTwip(style.lineHeight) : undefined
  if (before) spacingParts.push(`w:before="${before}"`)
  if (after) spacingParts.push(`w:after="${after}"`)
  if (line) spacingParts.push(`w:line="${line}" w:lineRule="auto"`)
  if (spacingParts.length) props.push(`<w:spacing ${spacingParts.join(' ')}/>`)
  if (listInfo?.numId !== undefined && listInfo.level !== undefined) {
    props.push(
      `<w:numPr><w:ilvl w:val="${listInfo.level}"/><w:numId w:val="${listInfo.numId}"/></w:numPr>`
    )
  }
  return props.length ? `<w:pPr>${props.join('')}</w:pPr>` : ''
}

const runToEndnoteXml = (run: DocRun): string => {
  const props: string[] = []
  const style = run.style
  if (style) {
    if (style.bold) props.push('<w:b/>')
    if (style.italic) props.push('<w:i/>')
    if (style.underline) props.push('<w:u w:val="single"/>')
    if (style.strike) props.push('<w:strike/>')
    const color = parseColor(style.color)
    if (color) props.push(`<w:color w:val="${color}"/>`)
    const bg = parseColor(style.backgroundColor)
    if (bg) props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`)
    const size = pxToHalfPoints(style.fontSize)
    if (size) props.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`)
    if (style.fontFamily) {
      const font = escapeXmlText(style.fontFamily.replace(/"/g, "'"))
      props.push(
        `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
      )
    }
    if (style.superscript) props.push('<w:vertAlign w:val="superscript"/>')
    if (style.subscript) props.push('<w:vertAlign w:val="subscript"/>')
  }
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
  const text = escapeXmlText(run.text || '')
  return `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`
}

const stripXmlTags = (value: string): string => value.replace(/<[^>]+>/g, '')

const buildParagraphXml = (
  runs: DocRun[],
  style?: DocParagraphBlock['style'],
  listInfo?: { numId?: string; level?: number }
): string => {
  const pPr = buildParagraphPropertiesXml(style, listInfo)
  const runXml = runs.length ? runs.map(runToEndnoteXml).join('') : '<w:r><w:t></w:t></w:r>'
  return `<w:p>${pPr}${runXml}</w:p>`
}

const blocksToEndnoteParagraphsXml = (
  blocks: DocBlock[],
  level: number = 0,
  numbering?: { bulletNumId?: string; orderedNumId?: string }
): string[] => {
  const paragraphs: string[] = []
  const pushParagraph = (
    runs: DocRun[],
    style?: DocParagraphBlock['style'],
    listInfo?: { numId?: string; level?: number }
  ) => {
    paragraphs.push(buildParagraphXml(runs, style, listInfo))
  }

  blocks.forEach((block) => {
    if (block.type === 'paragraph' || block.type === 'heading') {
      pushParagraph(block.runs, block.style)
    } else if (block.type === 'list') {
      const numId = block.kind === 'ordered' ? numbering?.orderedNumId : numbering?.bulletNumId
      block.items.forEach((item) => {
        let applied = false
        item.blocks.forEach((child) => {
          if (child.type === 'list') {
            paragraphs.push(...blocksToEndnoteParagraphsXml([child], level + 1, numbering))
            return
          }
          if (!applied && (child.type === 'paragraph' || child.type === 'heading')) {
            const runs =
              block.kind === 'task'
                ? [{ text: item.checked ? '☑ ' : '☐ ' }, ...child.runs]
                : child.runs
            pushParagraph(runs, child.style, { numId, level })
            applied = true
            return
          }
          if (child.type === 'paragraph' || child.type === 'heading') {
            pushParagraph(child.runs, child.style)
            return
          }
          if (child.type === 'blockquote') {
            paragraphs.push(...blocksToEndnoteParagraphsXml([child], level, numbering))
            return
          }
          if (child.type === 'code') {
            paragraphs.push(...blocksToEndnoteParagraphsXml([child], level, numbering))
            return
          }
          if (child.type === 'table') {
            paragraphs.push(buildEndnoteTableXml(child, numbering))
            return
          }
        })
        if (!applied) {
          const fallbackText = item.blocks
            .map((b) => stripXmlTags(blocksToEndnoteParagraphsXml([b], level, numbering).join('')))
            .join(' ')
          if (fallbackText.trim()) {
            pushParagraph([{ text: fallbackText }], undefined, { numId, level })
          }
        }
      })
    } else if (block.type === 'blockquote') {
      const inner = blocksToEndnoteParagraphsXml(block.blocks, level, numbering)
      inner.forEach((p) => {
        const withIndent = p.replace(
          '<w:p>',
          '<w:p><w:pPr><w:ind w:left="720"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="2563EB"/></w:pBdr></w:pPr>'
        )
        paragraphs.push(withIndent)
      })
    } else if (block.type === 'code') {
      const codeRuns: DocRun[] = [
        {
          text: block.text || '',
          style: { fontFamily: 'Consolas', backgroundColor: '#1F2937', color: '#F9FAFB' }
        }
      ]
      pushParagraph(codeRuns)
    } else if (block.type === 'table') {
      const tableXml = buildEndnoteTableXml(block, numbering)
      paragraphs.push(tableXml)
    }
  })

  return paragraphs.length ? paragraphs : ['<w:p><w:r><w:t></w:t></w:r></w:p>']
}

const buildEndnoteTableXml = (
  table: DocTableBlock,
  numbering?: { bulletNumId?: string; orderedNumId?: string }
): string => {
  const findCellBackground = (blocks: DocBlock[]): string | undefined => {
    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'heading') {
        for (const run of block.runs) {
          const bg = parseColor(run.style?.backgroundColor)
          if (bg) return bg
        }
      } else if (block.type === 'list') {
        for (const item of block.items) {
          const bg = findCellBackground(item.blocks)
          if (bg) return bg
        }
      } else if (block.type === 'blockquote') {
        const bg = findCellBackground(block.blocks)
        if (bg) return bg
      } else if (block.type === 'table') {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            const bg = findCellBackground(cell.blocks)
            if (bg) return bg
          }
        }
      }
    }
    return undefined
  }

  const findCellHeaderStyle = (blocks: DocBlock[]): boolean => {
    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'heading') {
        for (const run of block.runs) {
          if (run.style?.bold) return true
        }
      } else if (block.type === 'list') {
        for (const item of block.items) {
          if (findCellHeaderStyle(item.blocks)) return true
        }
      } else if (block.type === 'blockquote') {
        if (findCellHeaderStyle(block.blocks)) return true
      } else if (block.type === 'table') {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            if (findCellHeaderStyle(cell.blocks)) return true
          }
        }
      }
    }
    return false
  }

  const findCellAlign = (blocks: DocBlock[]): string | undefined => {
    for (const block of blocks) {
      if (block.type === 'paragraph' || block.type === 'heading') {
        if (block.style?.align) return block.style.align
      } else if (block.type === 'list') {
        for (const item of block.items) {
          const align = findCellAlign(item.blocks)
          if (align) return align
        }
      } else if (block.type === 'blockquote') {
        const align = findCellAlign(block.blocks)
        if (align) return align
      } else if (block.type === 'table') {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            const align = findCellAlign(cell.blocks)
            if (align) return align
          }
        }
      }
    }
    return undefined
  }
  const columnCount = Math.max(
    1,
    ...table.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0))
  )
  const gridWidth = Math.max(1, Math.round(9000 / columnCount))
  const grid = Array.from({ length: columnCount })
    .map(() => `<w:gridCol w:w="${gridWidth}"/>`)
    .join('')

  const applyCellAlignment = (xml: string, align?: string): string => {
    if (!align) return xml
    if (xml.includes('<w:jc')) return xml
    if (xml.includes('<w:pPr>')) {
      return xml.replace(/<w:pPr>/g, `<w:pPr><w:jc w:val="${align}"/>`)
    }
    return xml.replace(/<w:p>/g, `<w:p><w:pPr><w:jc w:val="${align}"/></w:pPr>`)
  }

  const applyHeaderBold = (xml: string): string => {
    if (xml.includes('<w:b/>')) return xml
    if (xml.includes('<w:rPr>')) {
      return xml.replace(/<w:rPr>/, '<w:rPr><w:b/>')
    }
    return xml.replace(/<w:r>/, '<w:r><w:rPr><w:b/></w:rPr>')
  }

  const spanTracker: Array<number> = new Array(columnCount).fill(0)
  const rowsXml: string[] = []

  table.rows.forEach((row, rowIndex) => {
    const cellsXml: string[] = []
    let colIndex = 0

    const emitVmergeContinue = () => {
      cellsXml.push(
        `<w:tc><w:tcPr><w:vMerge w:val="continue"/></w:tcPr><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>`
      )
      spanTracker[colIndex] = Math.max(0, spanTracker[colIndex] - 1)
      colIndex += 1
    }

    row.cells.forEach((cell) => {
      while (colIndex < columnCount && spanTracker[colIndex] > 0) {
        emitVmergeContinue()
      }
      if (colIndex >= columnCount) return

      const colspan = cell.colspan || 1
      const rowspan = cell.rowspan || 1
      const rawCellBlocks = blocksToEndnoteParagraphsXml(cell.blocks, 0, numbering).join('')
      const cellBg = findCellBackground(cell.blocks)
      const isHeaderCell = findCellHeaderStyle(cell.blocks)
      const cellAlign = findCellAlign(cell.blocks)
      const isFirstRow = rowIndex === 0
      let cellBlocks = applyCellAlignment(rawCellBlocks, cellAlign)
      if (isHeaderCell || isFirstRow) {
        cellBlocks = applyHeaderBold(cellBlocks)
      }
      const tcPrParts: string[] = []
      if (colspan > 1) tcPrParts.push(`<w:gridSpan w:val="${colspan}"/>`)
      if (rowspan > 1) tcPrParts.push(`<w:vMerge w:val="restart"/>`)
      tcPrParts.push('<w:vAlign w:val="center"/>')
      tcPrParts.push(`<w:tcW w:w="${gridWidth * colspan}" w:type="dxa"/>`)
      tcPrParts.push(
        '<w:tcMar>' +
          '<w:top w:w="80" w:type="dxa"/>' +
          '<w:bottom w:w="80" w:type="dxa"/>' +
          '<w:left w:w="120" w:type="dxa"/>' +
          '<w:right w:w="120" w:type="dxa"/>' +
          '</w:tcMar>'
      )
      if (cellBg) {
        tcPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${cellBg}"/>`)
      } else if (isHeaderCell || isFirstRow) {
        tcPrParts.push('<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>')
      }
      const tcPr = tcPrParts.length ? `<w:tcPr>${tcPrParts.join('')}</w:tcPr>` : ''
      cellsXml.push(`<w:tc>${tcPr}${cellBlocks}</w:tc>`)

      if (rowspan > 1) {
        for (let i = 0; i < colspan; i++) {
          spanTracker[colIndex + i] = rowspan - 1
        }
      }
      colIndex += colspan
    })

    while (colIndex < columnCount) {
      if (spanTracker[colIndex] > 0) {
        emitVmergeContinue()
      } else {
        cellsXml.push('<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>')
        colIndex += 1
      }
    }

    rowsXml.push(`<w:tr>${cellsXml.join('')}</w:tr>`)
  })

  const tblPr =
    '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/><w:tblBorders>' +
    '<w:top w:val="single" w:sz="8" w:space="0" w:color="CCCCCC"/>' +
    '<w:left w:val="single" w:sz="8" w:space="0" w:color="CCCCCC"/>' +
    '<w:bottom w:val="single" w:sz="8" w:space="0" w:color="CCCCCC"/>' +
    '<w:right w:val="single" w:sz="8" w:space="0" w:color="CCCCCC"/>' +
    '<w:insideH w:val="single" w:sz="6" w:space="0" w:color="DDDDDD"/>' +
    '<w:insideV w:val="single" w:sz="6" w:space="0" w:color="DDDDDD"/>' +
    '</w:tblBorders></w:tblPr>'

  return `<w:tbl>${tblPr}<w:tblGrid>${grid}</w:tblGrid>${rowsXml.join('')}</w:tbl>`
}

const buildEndnotesXml = (
  endnotes: Array<{ id: number; blocks: DocBlock[] }>,
  numbering?: { bulletNumId?: string; orderedNumId?: string }
): string => {
  const ns =
    'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ' +
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns:v="urn:schemas-microsoft-com:vml" ' +
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" ' +
    'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ' +
    'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" ' +
    'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" ' +
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
    'mc:Ignorable="w14 w15 wp14"'

  const separator = `
    <w:endnote w:type="separator" w:id="-1">
      <w:p><w:r><w:separator/></w:r></w:p>
    </w:endnote>
    <w:endnote w:type="continuationSeparator" w:id="0">
      <w:p><w:r><w:continuationSeparator/></w:r></w:p>
    </w:endnote>
  `

  const body = endnotes
    .map((note) => {
      const paragraphs = blocksToEndnoteParagraphsXml(note.blocks, 0, numbering)
      const paragraphsXml = paragraphs
        .map((p, idx) => {
          if (idx !== 0) return p
          return p.replace('<w:p>', '<w:p><w:r><w:endnoteRef/></w:r>')
        })
        .join('')
      return `<w:endnote w:id="${note.id}">${paragraphsXml}</w:endnote>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:endnotes ${ns}>
  ${separator}
  ${body}
</w:endnotes>`
}

const applyEndnotesToDocxBlob = async (
  blob: Blob,
  endnotes: Array<{ id: number; blocks: DocBlock[] }>
): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const documentXmlFile = zip.file('word/document.xml')
  if (!documentXmlFile) return blob
  const documentXml = await documentXmlFile.async('string')
  const idsFromDoc = extractEndnoteIdsFromXml(documentXml)
  if (idsFromDoc.length === 0 && endnotes.length === 0) return blob

  const updatedDocumentXml = replaceEndnoteTokens(documentXml)
  zip.file('word/document.xml', updatedDocumentXml)

  const endnoteMap = new Map<number, DocBlock[]>()
  endnotes.forEach((note) => endnoteMap.set(note.id, note.blocks))
  idsFromDoc.forEach((id) => {
    if (!endnoteMap.has(id)) endnoteMap.set(id, [])
  })
  let numberingInfo: { bulletNumId?: string; orderedNumId?: string } = {}
  const numberingFile = zip.file('word/numbering.xml')
  if (numberingFile) {
    try {
      const numberingXml = await numberingFile.async('string')
      const abstractMap = new Map<string, string>()
      const abstractRegex = /<w:abstractNum[^>]*w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/g
      let absMatch
      while ((absMatch = abstractRegex.exec(numberingXml)) !== null) {
        const absId = absMatch[1]
        const content = absMatch[0]
        const fmtMatch = content.match(/<w:numFmt w:val="([^"]+)"/)
        if (fmtMatch) {
          abstractMap.set(absId, fmtMatch[1])
        }
      }
      const numRegex = /<w:num[^>]*w:numId="(\d+)"[\s\S]*?<w:abstractNumId w:val="(\d+)"\/>/g
      let numMatch
      while ((numMatch = numRegex.exec(numberingXml)) !== null) {
        const numId = numMatch[1]
        const absId = numMatch[2]
        const fmt = abstractMap.get(absId)
        if (fmt === 'bullet' && !numberingInfo.bulletNumId) {
          numberingInfo.bulletNumId = numId
        }
        if (fmt === 'decimal' && !numberingInfo.orderedNumId) {
          numberingInfo.orderedNumId = numId
        }
      }
    } catch {
      numberingInfo = {}
    }
  }
  const endnotesXml = buildEndnotesXml(
    Array.from(endnoteMap.entries()).map(([id, blocks]) => ({ id, blocks })),
    numberingInfo
  )
  zip.file('word/endnotes.xml', endnotesXml)

  const relsFile = zip.file('word/_rels/document.xml.rels')
  if (relsFile) {
    const relsXml = await relsFile.async('string')
    if (!relsXml.includes('relationships/endnotes')) {
      const ids = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => parseInt(m[1], 10))
      const nextId = ids.length ? Math.max(...ids) + 1 : 1
      const relTag =
        `<Relationship Id="rId${nextId}" ` +
        `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" ` +
        `Target="endnotes.xml"/>`
      const updatedRelsXml = relsXml.replace(/<\/Relationships>/i, `${relTag}</Relationships>`)
      zip.file('word/_rels/document.xml.rels', updatedRelsXml)
    }
  }

  const contentTypesFile = zip.file('[Content_Types].xml')
  if (contentTypesFile) {
    const contentTypesXml = await contentTypesFile.async('string')
    if (!contentTypesXml.includes('word/endnotes.xml')) {
      const overrideTag =
        '<Override PartName="/word/endnotes.xml" ' +
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>'
      const updatedContentTypesXml = contentTypesXml.replace(/<\/Types>/i, `${overrideTag}</Types>`)
      zip.file('[Content_Types].xml', updatedContentTypesXml)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

export const docModelToDocx = async (model: DocModel, title?: string): Promise<Blob> => {
  const children = await blocksToElements(model.blocks)
  const headerBlocks = model.headers?.flatMap((section) => section.blocks) || []
  const footerBlocks = model.footers?.flatMap((section) => section.blocks) || []
  const headerElements = headerBlocks.length ? await blocksToElements(headerBlocks) : []
  const footerElements = footerBlocks.length ? await blocksToElements(footerBlocks) : []

  const footnotes = model.footnotes?.length
    ? Object.fromEntries(
        model.footnotes.map((note, index) => {
          const id = note.id ?? index + 1
          const paragraphs = blocksToParagraphs(note.blocks)
          return [id, { children: paragraphs }]
        })
      )
    : undefined

  const doc = new Document({
    title: title || '文档',
    creator: '协同编辑系统',
    description: '由协同编辑系统导出',
    footnotes,
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '●',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '○',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: '■',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 3,
              format: LevelFormat.BULLET,
              text: '□',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(2), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 4,
              format: LevelFormat.BULLET,
              text: '●',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(2.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            }
          ]
        },
        {
          reference: 'ordered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: '%2)',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 2,
              format: LevelFormat.LOWER_ROMAN,
              text: '%3.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 3,
              format: LevelFormat.DECIMAL,
              text: '(%4)',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(2), hanging: convertInchesToTwip(0.25) }
                }
              }
            },
            {
              level: 4,
              format: LevelFormat.LOWER_LETTER,
              text: '(%5)',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(2.5), hanging: convertInchesToTwip(0.25) }
                }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        headers: headerElements.length
          ? {
              default: new Header({ children: headerElements })
            }
          : undefined,
        footers: footerElements.length
          ? {
              default: new Footer({ children: footerElements })
            }
          : undefined,
        children
      }
    ]
  })
  const blob = await Packer.toBlob(doc)
  const endnotes = model.endnotes?.length
    ? model.endnotes.map((note, index) => ({
        id: note.id ?? index + 1,
        blocks: note.blocks
      }))
    : []
  if (endnotes.length === 0) return blob
  return applyEndnotesToDocxBlob(blob, endnotes)
}
