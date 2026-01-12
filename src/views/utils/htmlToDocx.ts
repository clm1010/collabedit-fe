/**
 * HTML 转 DOCX 工具
 * 使用 docx 库将 Tiptap 编辑器的 HTML 内容转换为真实的 DOCX 文件
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  BorderStyle,
  PageBreak,
  ShadingType,
  UnderlineType,
  VerticalAlign,
  TableLayoutType,
  convertInchesToTwip,
  LevelFormat
} from 'docx'

// ==================== 类型定义 ====================

/** 文本样式接口 */
interface TextStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontFamily?: string
  superscript?: boolean
  subscript?: boolean
}

/** 段落样式接口 */
interface ParagraphStyle {
  alignment?: 'left' | 'center' | 'right' | 'justify'
  indent?: number
  lineHeight?: number
}

/** 列表项接口 */
interface ListItemInfo {
  level: number
  type: 'bullet' | 'number' | 'task'
  checked?: boolean
}

// ==================== 工具函数 ====================

/**
 * 解析颜色值，转换为 DOCX 支持的格式（不带 #）
 */
const parseColor = (color: string): string => {
  if (!color) return '000000'
  // 移除 # 前缀
  if (color.startsWith('#')) {
    return color.slice(1).toUpperCase()
  }
  // 处理 rgb() 格式
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `${r}${g}${b}`.toUpperCase()
  }
  // 处理 rgba() 格式
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
    return `${r}${g}${b}`.toUpperCase()
  }
  // 常见颜色名称映射
  const colorMap: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    red: 'FF0000',
    green: '00FF00',
    blue: '0000FF',
    yellow: 'FFFF00',
    gray: '808080',
    grey: '808080'
  }
  return colorMap[color.toLowerCase()] || '000000'
}

/**
 * 解析字号，转换为半点（half-points）
 * Word 中 1pt = 2 half-points
 */
const parseFontSize = (fontSize: string): number => {
  if (!fontSize) return 24 // 默认 12pt = 24 half-points
  const match = fontSize.match(/([\d.]+)(px|pt|em|rem)?/)
  if (!match) return 24
  const value = parseFloat(match[1])
  const unit = match[2] || 'px'
  switch (unit) {
    case 'pt':
      return Math.round(value * 2)
    case 'px':
      return Math.round(value * 1.5) // 近似转换
    case 'em':
    case 'rem':
      return Math.round(value * 24) // 1em ≈ 12pt
    default:
      return 24
  }
}

/**
 * 解析对齐方式
 */
const parseAlignment = (align: string): AlignmentType => {
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

/**
 * 解析标题级别
 */
const parseHeadingLevel = (tagName: string): HeadingLevel | undefined => {
  const levels: Record<string, HeadingLevel> = {
    H1: HeadingLevel.HEADING_1,
    H2: HeadingLevel.HEADING_2,
    H3: HeadingLevel.HEADING_3,
    H4: HeadingLevel.HEADING_4,
    H5: HeadingLevel.HEADING_5,
    H6: HeadingLevel.HEADING_6
  }
  return levels[tagName]
}

/**
 * 从 base64 数据 URL 提取图片数据
 */
const extractBase64Image = (
  src: string
): { data: Uint8Array; type: 'png' | 'jpeg' | 'gif' | 'bmp' } | null => {
  const match = src.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1] === 'jpg' ? 'jpeg' : (match[1] as 'png' | 'jpeg' | 'gif' | 'bmp')
  const base64Data = match[2]

  // 将 base64 转换为 Uint8Array
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return { data: bytes, type: mimeType }
}

/**
 * 获取元素的计算样式
 */
const getElementStyle = (element: Element): TextStyle => {
  const style: TextStyle = {}
  const computedStyle = (element as HTMLElement).style

  // 检查内联样式
  if (computedStyle) {
    if (computedStyle.color) {
      style.color = parseColor(computedStyle.color)
    }
    if (computedStyle.backgroundColor) {
      style.backgroundColor = parseColor(computedStyle.backgroundColor)
    }
    if (computedStyle.fontSize) {
      style.fontSize = parseFontSize(computedStyle.fontSize)
    }
    if (computedStyle.fontFamily) {
      style.fontFamily = computedStyle.fontFamily.replace(/['"]/g, '').split(',')[0].trim()
    }
  }

  return style
}

/**
 * 获取段落的对齐方式
 */
const getParagraphAlignment = (element: Element): AlignmentType => {
  const style = (element as HTMLElement).style
  if (style && style.textAlign) {
    return parseAlignment(style.textAlign)
  }
  // 检查 data-text-align 属性（Tiptap 可能使用）
  const dataAlign = element.getAttribute('data-text-align')
  if (dataAlign) {
    return parseAlignment(dataAlign)
  }
  return AlignmentType.LEFT
}

// ==================== 节点转换函数 ====================

/**
 * 处理文本节点，生成 TextRun
 */
const createTextRun = (text: string, style: TextStyle = {}): TextRun => {
  const options: any = {
    text,
    bold: style.bold,
    italics: style.italic,
    strike: style.strike,
    superScript: style.superscript,
    subScript: style.subscript
  }

  if (style.underline) {
    options.underline = { type: UnderlineType.SINGLE }
  }

  if (style.color) {
    options.color = style.color
  }

  if (style.fontSize) {
    options.size = style.fontSize
  }

  if (style.fontFamily) {
    options.font = style.fontFamily
  }

  if (style.backgroundColor) {
    options.shading = {
      type: ShadingType.SOLID,
      color: style.backgroundColor
    }
  }

  if (style.code) {
    options.font = 'Consolas'
    options.shading = {
      type: ShadingType.SOLID,
      color: 'F3F4F6'
    }
  }

  return new TextRun(options)
}

/**
 * 递归处理元素节点，提取文本和样式
 */
const processInlineElements = (
  node: Node,
  parentStyle: TextStyle = {},
  runs: TextRun[] = []
): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    if (text) {
      runs.push(createTextRun(text, parentStyle))
    }
    return runs
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element
    const tagName = element.tagName.toUpperCase()

    // 合并样式
    const style: TextStyle = { ...parentStyle, ...getElementStyle(element) }

    // 根据标签更新样式
    switch (tagName) {
      case 'STRONG':
      case 'B':
        style.bold = true
        break
      case 'EM':
      case 'I':
        style.italic = true
        break
      case 'U':
        style.underline = true
        break
      case 'S':
      case 'DEL':
      case 'STRIKE':
        style.strike = true
        break
      case 'CODE':
        style.code = true
        break
      case 'SUP':
        style.superscript = true
        break
      case 'SUB':
        style.subscript = true
        break
      case 'MARK':
        // 从 mark 元素获取实际的背景色，而不是硬编码
        const markBgColor =
          (element as HTMLElement).style.backgroundColor ||
          element.getAttribute('data-color') ||
          element.getAttribute('style')?.match(/background-color:\s*([^;]+)/i)?.[1]
        if (markBgColor) {
          style.backgroundColor = parseColor(markBgColor)
        } else {
          // 默认黄色（Tiptap 默认高亮色）
          style.backgroundColor = 'FFFF00'
        }
        break
      case 'BR':
        runs.push(new TextRun({ text: '', break: 1 }))
        return runs
      case 'A':
        // 链接特殊处理 - 添加下划线和蓝色
        style.underline = true
        style.color = '0000FF'
        break
    }

    // 递归处理子节点
    for (const child of Array.from(node.childNodes)) {
      processInlineElements(child, style, runs)
    }
  }

  return runs
}

/**
 * 处理图片元素
 */
const processImage = (img: HTMLImageElement): ImageRun | null => {
  const src = img.getAttribute('src')
  if (!src) return null

  const imageData = extractBase64Image(src)
  if (!imageData) return null

  // 获取图片尺寸
  let width = parseInt(img.getAttribute('width') || '400')
  let height = parseInt(img.getAttribute('height') || '300')

  // 从 style 获取尺寸
  const style = img.style
  if (style.width) {
    const w = parseInt(style.width)
    if (!isNaN(w)) width = w
  }
  if (style.height) {
    const h = parseInt(style.height)
    if (!isNaN(h)) height = h
  }

  // 限制最大宽度为 600px（约 6 英寸）
  if (width > 600) {
    const ratio = 600 / width
    width = 600
    height = Math.round(height * ratio)
  }

  return new ImageRun({
    data: imageData.data,
    transformation: {
      width,
      height
    },
    type: imageData.type
  })
}

/**
 * 处理段落元素
 */
const processParagraph = (element: Element, listInfo?: ListItemInfo): Paragraph => {
  const runs = processInlineElements(element)
  const alignment = getParagraphAlignment(element)

  const options: any = {
    children: runs,
    alignment
  }

  // 处理列表
  if (listInfo) {
    options.numbering = {
      reference: listInfo.type === 'number' ? 'ordered-list' : 'bullet-list',
      level: listInfo.level
    }
  }

  return new Paragraph(options)
}

/**
 * 处理标题元素
 */
const processHeading = (element: Element): Paragraph => {
  const runs = processInlineElements(element)
  const level = parseHeadingLevel(element.tagName.toUpperCase())
  const alignment = getParagraphAlignment(element)

  return new Paragraph({
    children: runs,
    heading: level,
    alignment
  })
}

/**
 * 处理列表元素
 */
const processList = (
  element: Element,
  level: number = 0,
  type: 'bullet' | 'number' = 'bullet'
): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  const tagName = element.tagName.toUpperCase()

  // 确定列表类型
  if (tagName === 'OL') {
    type = 'number'
  } else if (tagName === 'UL') {
    // 检查是否是任务列表
    const dataType = element.getAttribute('data-type')
    if (dataType === 'taskList') {
      type = 'bullet' // 任务列表使用项目符号
    }
  }

  for (const child of Array.from(element.children)) {
    if (child.tagName.toUpperCase() === 'LI') {
      // 处理列表项内容
      const listItemContent: (TextRun | ImageRun)[] = []

      for (const liChild of Array.from(child.childNodes)) {
        if (liChild.nodeType === Node.TEXT_NODE) {
          const text = liChild.textContent?.trim()
          if (text) {
            listItemContent.push(new TextRun({ text }))
          }
        } else if (liChild.nodeType === Node.ELEMENT_NODE) {
          const liElement = liChild as Element
          const liTagName = liElement.tagName.toUpperCase()

          if (liTagName === 'UL' || liTagName === 'OL') {
            // 嵌套列表
            paragraphs.push(
              ...processList(liElement, level + 1, liTagName === 'OL' ? 'number' : 'bullet')
            )
          } else if (liTagName === 'P') {
            // 段落内容
            const runs = processInlineElements(liElement)
            listItemContent.push(...runs)
          } else if (liTagName === 'IMG') {
            const img = processImage(liElement as HTMLImageElement)
            if (img) listItemContent.push(img)
          } else {
            // 其他内联元素
            const runs = processInlineElements(liElement)
            listItemContent.push(...runs)
          }
        }
      }

      if (listItemContent.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: listItemContent,
            numbering: {
              reference: type === 'number' ? 'ordered-list' : 'bullet-list',
              level
            }
          })
        )
      }
    }
  }

  return paragraphs
}

/**
 * 处理表格元素
 */
const processTable = (table: Element): Table => {
  const rows: TableRow[] = []

  // 获取所有行（包括 thead 和 tbody 中的）
  const allRows = table.querySelectorAll('tr')

  for (const tr of Array.from(allRows)) {
    const cells: TableCell[] = []

    for (const cellElement of Array.from(tr.children)) {
      const tagName = cellElement.tagName.toUpperCase()
      if (tagName !== 'TD' && tagName !== 'TH') continue

      const cellContent: Paragraph[] = []
      const isHeader = tagName === 'TH'

      // 处理单元格内容
      if (cellElement.childNodes.length === 0) {
        cellContent.push(new Paragraph({ children: [] }))
      } else {
        for (const child of Array.from(cellElement.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim()
            if (text) {
              cellContent.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text,
                      bold: isHeader
                    })
                  ]
                })
              )
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childElement = child as Element
            const childTag = childElement.tagName.toUpperCase()

            if (childTag === 'P') {
              const runs = processInlineElements(childElement)
              if (isHeader) {
                // 标题行加粗
                runs.forEach((run: any) => {
                  if (run.options) run.options.bold = true
                })
              }
              cellContent.push(
                new Paragraph({
                  children: runs,
                  alignment: getParagraphAlignment(childElement)
                })
              )
            } else if (childTag === 'IMG') {
              const img = processImage(childElement as HTMLImageElement)
              if (img) {
                cellContent.push(new Paragraph({ children: [img] }))
              }
            } else {
              const runs = processInlineElements(childElement)
              cellContent.push(new Paragraph({ children: runs }))
            }
          }
        }
      }

      if (cellContent.length === 0) {
        cellContent.push(new Paragraph({ children: [] }))
      }

      // 获取单元格样式
      const cellStyle = (cellElement as HTMLElement).style
      const bgColor = cellStyle?.backgroundColor
        ? parseColor(cellStyle.backgroundColor)
        : isHeader
          ? 'F5F5F5'
          : undefined

      // 获取对齐方式
      const textAlign = cellStyle?.textAlign || cellElement.getAttribute('data-text-align')
      const verticalAlign =
        cellStyle?.verticalAlign || cellElement.getAttribute('data-vertical-align')

      // 获取合并信息
      const colspan = parseInt(cellElement.getAttribute('colspan') || '1')
      const rowspan = parseInt(cellElement.getAttribute('rowspan') || '1')

      cells.push(
        new TableCell({
          children: cellContent,
          shading: bgColor
            ? {
                type: ShadingType.SOLID,
                color: bgColor
              }
            : undefined,
          verticalAlign:
            verticalAlign === 'middle'
              ? VerticalAlign.CENTER
              : verticalAlign === 'bottom'
                ? VerticalAlign.BOTTOM
                : VerticalAlign.TOP,
          columnSpan: colspan > 1 ? colspan : undefined,
          rowSpan: rowspan > 1 ? rowspan : undefined
        })
      )
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }))
    }
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    layout: TableLayoutType.FIXED
  })
}

/**
 * 处理引用块
 */
const processBlockquote = (element: Element): Paragraph[] => {
  const paragraphs: Paragraph[] = []

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text,
                italics: true,
                color: '666666'
              })
            ],
            indent: {
              left: convertInchesToTwip(0.5)
            },
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
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element
      const runs = processInlineElements(childElement)
      // 给引用内容添加斜体和灰色
      const styledRuns = runs.map((run: any) => {
        if (run.options) {
          run.options.italics = true
          if (!run.options.color) run.options.color = '666666'
        }
        return run
      })
      paragraphs.push(
        new Paragraph({
          children: styledRuns,
          indent: {
            left: convertInchesToTwip(0.5)
          },
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
  }

  return paragraphs
}

/**
 * 处理代码块
 */
const processCodeBlock = (element: Element): Paragraph[] => {
  const code = element.querySelector('code')
  const text = code?.textContent || element.textContent || ''
  const lines = text.split('\n')

  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ', // 空行用空格占位
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

/**
 * 处理分页符
 */
const processPageBreak = (): Paragraph => {
  return new Paragraph({
    children: [new PageBreak()]
  })
}

// ==================== 主函数 ====================

/**
 * 将 HTML 转换为 DOCX 文档元素
 */
const convertHtmlToDocxElements = (html: string): (Paragraph | Table)[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const elements: (Paragraph | Table)[] = []

  const processNode = (node: Node): void => {
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const element = node as Element
    const tagName = element.tagName.toUpperCase()

    switch (tagName) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        elements.push(processHeading(element))
        break

      case 'P':
        elements.push(processParagraph(element))
        break

      case 'UL':
      case 'OL':
        elements.push(...processList(element))
        break

      case 'TABLE':
        elements.push(processTable(element))
        break

      case 'BLOCKQUOTE':
        elements.push(...processBlockquote(element))
        break

      case 'PRE':
        elements.push(...processCodeBlock(element))
        break

      case 'HR':
      case 'DIV':
        // 检查是否是分页符
        if (
          element.classList.contains('page-break') ||
          element.getAttribute('data-type') === 'pageBreak'
        ) {
          elements.push(processPageBreak())
        } else {
          // 递归处理 div 内容
          for (const child of Array.from(element.childNodes)) {
            processNode(child)
          }
        }
        break

      case 'IMG':
        const img = processImage(element as HTMLImageElement)
        if (img) {
          elements.push(new Paragraph({ children: [img] }))
        }
        break

      case 'BR':
        elements.push(new Paragraph({ children: [] }))
        break

      default:
        // 递归处理其他容器元素
        for (const child of Array.from(element.childNodes)) {
          processNode(child)
        }
    }
  }

  // 处理 body 内的所有节点
  for (const child of Array.from(doc.body.childNodes)) {
    processNode(child)
  }

  // 如果没有内容，添加一个空段落
  if (elements.length === 0) {
    elements.push(new Paragraph({ children: [] }))
  }

  return elements
}

/**
 * 将 Tiptap 编辑器的 HTML 转换为真实 DOCX Blob
 * @param html - Tiptap 输出的 HTML 字符串
 * @param title - 文档标题（可选，用于元数据）
 * @returns Promise<Blob> - DOCX 文件 Blob
 */
export async function htmlToDocx(html: string, title?: string): Promise<Blob> {
  // 转换 HTML 为 DOCX 元素
  const children = convertHtmlToDocxElements(html)

  // 创建文档
  const doc = new Document({
    title: title || '文档',
    creator: '协同编辑系统',
    description: '由协同编辑系统导出',
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
        properties: {
          page: {
            size: {
              // A4 尺寸
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69)
            },
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            }
          }
        },
        children
      }
    ]
  })

  // 打包为 Blob
  return await Packer.toBlob(doc)
}

/**
 * 导出默认函数
 */
export default htmlToDocx
