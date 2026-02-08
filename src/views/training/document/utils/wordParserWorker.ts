/**
 * Word 文档解析 Web Worker
 * 用于非阻塞解析大型 Word 文档
 *
 * 注意：docx-preview 需要 DOM，无法在 Worker 中直接使用
 * 因此 Worker 主要用于 OOXML 解析方案
 */

// 列表编号定义类型
interface NumberingLevel {
  level: string
  format: string
  text: string
  start: string
}

// 进度回调类型
type ProgressCallback = (progress: number, text: string) => void

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * 解析 numbering.xml
 */
async function parseNumberingXml(zip: any): Promise<Map<string, NumberingLevel[]>> {
  const numberingMap = new Map<string, NumberingLevel[]>()
  const numberingFile = zip.file('word/numbering.xml')
  if (!numberingFile) return numberingMap

  try {
    const content = await numberingFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    const abstractNums = obj?.['w:numbering']?.['w:abstractNum'] || []
    const numsList = Array.isArray(abstractNums) ? abstractNums : [abstractNums]

    for (const num of numsList) {
      if (!num) continue
      const abstractNumId = num['@_w:abstractNumId']
      const levels = num['w:lvl'] || []
      const levelsList = Array.isArray(levels) ? levels : [levels]

      numberingMap.set(
        abstractNumId,
        levelsList.map((lvl: any) => ({
          level: lvl['@_w:ilvl'] || '0',
          format: lvl['w:numFmt']?.['@_w:val'] || 'decimal',
          text: lvl['w:lvlText']?.['@_w:val'] || '',
          start: lvl['w:start']?.['@_w:val'] || '1'
        }))
      )
    }
  } catch (e) {
    console.warn('解析 numbering.xml 失败:', e)
  }

  return numberingMap
}

/**
 * 解析 fontTable.xml
 */
async function parseFontTableXml(zip: any): Promise<Map<string, string>> {
  const fontMap = new Map<string, string>()
  const fontFile = zip.file('word/fontTable.xml')
  if (!fontFile) return fontMap

  try {
    const content = await fontFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    const fonts = obj?.['w:fonts']?.['w:font'] || []
    const fontsList = Array.isArray(fonts) ? fonts : [fonts]

    for (const font of fontsList) {
      if (!font) continue
      const name = font['@_w:name']
      if (name) {
        const altName = font['w:altName']?.['@_w:val']
        fontMap.set(name, altName || name)
      }
    }
  } catch (e) {
    console.warn('解析 fontTable.xml 失败:', e)
  }

  return fontMap
}

/**
 * 解析 styles.xml
 */
async function parseStylesXmlEnhanced(zip: any): Promise<Record<string, any>> {
  const stylesMap: Record<string, any> = {}
  const stylesFile = zip.file('word/styles.xml')
  if (!stylesFile) return stylesMap

  try {
    const content = await stylesFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(content)

    const docDefaults = obj?.['w:styles']?.['w:docDefaults']
    if (docDefaults) {
      const rPrDefault = docDefaults['w:rPrDefault']?.['w:rPr'] || {}
      const pPrDefault = docDefaults['w:pPrDefault']?.['w:pPr'] || {}
      stylesMap['__default__'] = { rPr: rPrDefault, pPr: pPrDefault }
    }

    const styles = obj?.['w:styles']?.['w:style'] || []
    const stylesList = Array.isArray(styles) ? styles : [styles]

    for (const style of stylesList) {
      if (!style) continue
      const styleId = style['@_w:styleId']
      if (!styleId) continue

      const rPr = style['w:rPr'] || {}
      const pPr = style['w:pPr'] || {}
      const basedOn = style['w:basedOn']?.['@_w:val']

      stylesMap[styleId] = {
        rPr,
        pPr,
        name: style['w:name']?.['@_w:val'] || styleId,
        basedOn,
        type: style['@_w:type'] || 'paragraph'
      }
    }
  } catch (e) {
    console.warn('解析 styles.xml 失败:', e)
  }

  return stylesMap
}

/**
 * 处理所有图片资源
 */
async function processAllImages(zip: any): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  try {
    const relsFile = zip.file('word/_rels/document.xml.rels')
    if (!relsFile) return imageMap

    const relsContent = await relsFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const relsObj = parser.parse(relsContent)
    const relationships = relsObj?.['Relationships']?.['Relationship'] || []
    const relsList = Array.isArray(relationships) ? relationships : [relationships]

    for (const rel of relsList) {
      if (!rel) continue
      const type = rel['@_Type'] || ''
      const target = rel['@_Target'] || ''
      const id = rel['@_Id'] || ''

      if (type.includes('image')) {
        const imagePath = target.startsWith('/') ? target.substring(1) : `word/${target}`
        const imageFile = zip.file(imagePath)

        if (imageFile) {
          try {
            const imageData = (await imageFile.async('base64')).replace(/[\s\r\n]+/g, '')
            const ext = target.split('.').pop()?.toLowerCase() || 'png'
            const mimeType =
              ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'gif'
                  ? 'image/gif'
                  : ext === 'webp'
                    ? 'image/webp'
                    : 'image/png'
            imageMap.set(id, `data:${mimeType};base64,${imageData}`)
          } catch (e) {
            console.warn(`处理图片失败: ${imagePath}`, e)
          }
        }
      }
    }
  } catch (e) {
    console.warn('处理图片资源失败:', e)
  }

  return imageMap
}

/**
 * 处理超链接关系
 */
async function processAllHyperlinks(zip: any): Promise<Map<string, string>> {
  const hyperlinkMap = new Map<string, string>()

  try {
    const relsFile = zip.file('word/_rels/document.xml.rels')
    if (!relsFile) return hyperlinkMap

    const relsContent = await relsFile.async('string')
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const relsObj = parser.parse(relsContent)
    const relationships = relsObj?.['Relationships']?.['Relationship'] || []
    const relsList = Array.isArray(relationships) ? relationships : [relationships]

    for (const rel of relsList) {
      if (!rel) continue
      const type = rel['@_Type'] || ''
      const target = rel['@_Target'] || ''
      const id = rel['@_Id'] || ''
      if (type.includes('hyperlink') && id && target) {
        hyperlinkMap.set(id, target)
      }
    }
  } catch (e) {
    console.warn('处理超链接映射失败:', e)
  }

  return hyperlinkMap
}

/**
 * 转换段落为 HTML
 */
function convertParagraphToHtml(
  para: any,
  _stylesMap: Record<string, any>,
  imageMap?: Map<string, string>,
  hyperlinkMap?: Map<string, string>
): string {
  if (!para) return ''

  const pPr = para['w:pPr'] || {}
  const runs = para['w:r']

  const styleArr: string[] = []
  let headingLevel = 0 // 标题级别

  // 检测段落样式（标题）
  const pStyle = pPr['w:pStyle']?.['@_w:val']
  if (pStyle) {
    // 识别标题样式
    const headingMatch = pStyle.match(/^(?:Heading|标题|heading)(\d)$/i)
    if (headingMatch) {
      headingLevel = parseInt(headingMatch[1])
    } else if (/^(H[1-6]|Title|TOC)/i.test(pStyle)) {
      const numMatch = pStyle.match(/\d/)
      headingLevel = numMatch ? parseInt(numMatch[0]) : 1
    } else if (_stylesMap[pStyle]) {
      // 从样式定义中获取 outlineLevel
      const styleDef = _stylesMap[pStyle]
      const outlineLevel = styleDef.pPr?.['w:outlineLvl']?.['@_w:val']
      if (outlineLevel !== undefined) {
        headingLevel = parseInt(outlineLevel) + 1
      }
    }
  }

  // 文本对齐
  const jc = pPr['w:jc']?.['@_w:val']
  if (jc) {
    const alignMap: Record<string, string> = {
      left: 'left',
      center: 'center',
      right: 'right',
      both: 'justify',
      justify: 'justify'
    }
    if (alignMap[jc]) {
      styleArr.push(`text-align: ${alignMap[jc]}`)
    }
  }

  // 首行缩进
  const ind = pPr['w:ind']
  if (ind) {
    const firstLine = ind['@_w:firstLine'] || ind['@_w:firstLineChars']
    if (firstLine) {
      const value = parseInt(firstLine)
      if (ind['@_w:firstLineChars']) {
        styleArr.push(`text-indent: ${value / 100}em`)
      } else {
        styleArr.push(`text-indent: ${value / 20}pt`)
      }
    }
  }

  // 行高
  const spacing = pPr['w:spacing']
  if (spacing) {
    const line = spacing['@_w:line']
    const lineRule = spacing['@_w:lineRule']
    if (line) {
      const lineValue = parseInt(line)
      if (lineRule === 'exact' || lineRule === 'atLeast') {
        styleArr.push(`line-height: ${lineValue / 20}pt`)
      } else {
        styleArr.push(`line-height: ${(lineValue / 240).toFixed(2)}`)
      }
    }
  }

  // 处理段落内容
  let content = ''
  if (runs) {
    const runsList = Array.isArray(runs) ? runs : [runs]
    for (const run of runsList) {
      content += convertRunToHtml(run, _stylesMap, imageMap)
    }
  }

  // 处理超链接
  const hyperlink = para['w:hyperlink']
  if (hyperlink) {
    const hyperlinkList = Array.isArray(hyperlink) ? hyperlink : [hyperlink]
    for (const linkItem of hyperlinkList) {
      const hyperlinkRuns = linkItem?.['w:r']
      if (!hyperlinkRuns) continue
      const runsList = Array.isArray(hyperlinkRuns) ? hyperlinkRuns : [hyperlinkRuns]
      let linkContent = ''
      for (const run of runsList) {
        linkContent += convertRunToHtml(run, _stylesMap, imageMap)
      }
      const linkId = linkItem?.['@_r:id']
      const anchor = linkItem?.['@_w:anchor']
      const href = linkId ? hyperlinkMap?.get(linkId) : anchor ? `#${anchor}` : ''
      if (href) {
        content += `<a href="${href}">${linkContent}</a>`
      } else {
        content += linkContent
      }
    }
  }

  const style = styleArr.length > 0 ? ` style="${styleArr.join('; ')}"` : ''

  // 如果是标题，使用对应的标题标签
  if (headingLevel >= 1 && headingLevel <= 6) {
    return `<h${headingLevel}${style}>${content || ''}</h${headingLevel}>`
  }

  return `<p${style}>${content || '<br>'}</p>`
}

/**
 * 转换 Run 为 HTML
 */
function convertRunToHtml(
  run: any,
  _stylesMap: Record<string, any>,
  imageMap?: Map<string, string>
): string {
  if (!run) return ''

  const rPr = run['w:rPr'] || {}

  // 处理换行
  if (run['w:br']) {
    return '<br>'
  }

  // 处理制表符
  if (run['w:tab']) {
    return '&emsp;&emsp;'
  }

  // 处理图片 (w:drawing)
  const drawing = run['w:drawing']
  if (drawing && imageMap) {
    const imgHtml = extractImageFromDrawing(drawing, imageMap)
    if (imgHtml) return imgHtml
  }

  // 获取文本内容
  let text = ''
  const textNode = run['w:t']
  if (textNode) {
    text = typeof textNode === 'string' ? textNode : textNode['#text'] || textNode['_'] || ''
  }

  if (!text) return ''

  // 提取样式
  const style: string[] = []

  // 字体
  const rFonts = rPr['w:rFonts']
  if (rFonts) {
    const font = rFonts['@_w:eastAsia'] || rFonts['@_w:ascii'] || rFonts['@_w:hAnsi']
    if (font) {
      style.push(`font-family: "${font}"`)
    }
  }

  // 字号
  const sz = rPr['w:sz'] || rPr['w:szCs']
  if (sz) {
    const size = parseInt(sz['@_w:val']) / 2
    if (size > 0) {
      style.push(`font-size: ${size}pt`)
    }
  }

  // 颜色
  const color = rPr['w:color']
  if (color) {
    const colorVal = color['@_w:val']
    if (colorVal && colorVal !== 'auto') {
      style.push(`color: #${colorVal}`)
    }
  }

  // 高亮
  const highlight = rPr['w:highlight']
  if (highlight) {
    const highlightColor = highlight['@_w:val']
    if (highlightColor) {
      const colorMap: Record<string, string> = {
        yellow: '#FFFF00',
        green: '#00FF00',
        cyan: '#00FFFF',
        magenta: '#FF00FF',
        blue: '#0000FF',
        red: '#FF0000',
        darkBlue: '#00008B',
        darkCyan: '#008B8B',
        darkGreen: '#006400',
        darkMagenta: '#8B008B',
        darkRed: '#8B0000',
        darkYellow: '#808000',
        darkGray: '#A9A9A9',
        lightGray: '#D3D3D3',
        black: '#000000'
      }
      style.push(`background-color: ${colorMap[highlightColor] || highlightColor}`)
    }
  }

  // 加粗
  const bold = rPr['w:b']
  if (bold !== undefined && bold !== null) {
    const isOff = bold['@_w:val'] === 'false' || bold['@_w:val'] === '0'
    if (!isOff) {
      style.push('font-weight: bold')
    }
  }

  // 斜体
  const italic = rPr['w:i']
  if (italic !== undefined && italic !== null) {
    const isOff = italic['@_w:val'] === 'false' || italic['@_w:val'] === '0'
    if (!isOff) {
      style.push('font-style: italic')
    }
  }

  // 下划线
  const underline = rPr['w:u']
  if (underline !== undefined && underline !== null) {
    const val = underline['@_w:val']
    if (val && val !== 'none') {
      style.push('text-decoration: underline')
    }
  }

  // 删除线
  const strike = rPr['w:strike']
  if (strike !== undefined && strike !== null) {
    const isOff = strike['@_w:val'] === 'false' || strike['@_w:val'] === '0'
    if (!isOff) {
      style.push('text-decoration: line-through')
    }
  }

  const styleAttr = style.length ? ` style="${style.join('; ')}"` : ''
  return `<span${styleAttr}>${escapeHtml(text)}</span>`
}

/**
 * 从 drawing 元素提取图片
 */
function extractImageFromDrawing(drawing: any, imageMap: Map<string, string>): string {
  try {
    const inline = drawing['wp:inline']
    if (inline) {
      return extractImageFromInlineOrAnchor(inline, imageMap)
    }

    const anchor = drawing['wp:anchor']
    if (anchor) {
      return extractImageFromInlineOrAnchor(anchor, imageMap)
    }
  } catch (e) {
    console.warn('提取图片失败:', e)
  }
  return ''
}

/**
 * 从 inline/anchor 元素提取图片
 */
function extractImageFromInlineOrAnchor(element: any, imageMap: Map<string, string>): string {
  try {
    const extent = element['wp:extent']
    let width = 0
    if (extent) {
      width = Math.round((parseInt(extent['@_cx'] || '0') / 914400) * 96)
    }

    const graphic = element['a:graphic']
    const graphicData = graphic?.['a:graphicData']
    const pic = graphicData?.['pic:pic']
    const blipFill = pic?.['pic:blipFill']
    const blip = blipFill?.['a:blip']

    if (blip) {
      const embedId = blip['@_r:embed']
      if (embedId && imageMap.has(embedId)) {
        const src = imageMap.get(embedId)
        const styleArr = ['max-width: 100%', 'height: auto', 'display: block']
        if (width > 0) styleArr.unshift(`width: ${Math.min(width, 540)}px`)
        return `<img src="${src}" style="${styleArr.join('; ')}" />`
      }
    }
  } catch (e) {
    console.warn('解析图片元素失败:', e)
  }
  return ''
}

/**
 * 转换表格为 HTML
 */
function convertTableToHtml(
  table: any,
  stylesMap: Record<string, any>,
  imageMap?: Map<string, string>,
  hyperlinkMap?: Map<string, string>
): string {
  if (!table) return ''

  const rows = table['w:tr']
  if (!rows) return ''

  const rowsList = Array.isArray(rows) ? rows : [rows]
  let html =
    '<table style="border-collapse: collapse; width: 100%; max-width: 100%; table-layout: auto; margin: 1em 0;">'

  for (const row of rowsList) {
    html += '<tr>'
    const cells = row['w:tc']
    if (cells) {
      const cellsList = Array.isArray(cells) ? cells : [cells]
      for (const cell of cellsList) {
        const cellStyle: string[] = [
          'border: 1px solid #ddd',
          'padding: 8px',
          'word-wrap: break-word',
          'overflow-wrap: break-word'
        ]

        // 处理单元格属性
        const tcPr = cell['w:tcPr']
        if (tcPr) {
          const vAlign = tcPr['w:vAlign']
          if (vAlign) {
            const val = vAlign['@_w:val']
            if (val) {
              cellStyle.push(`vertical-align: ${val}`)
            }
          }

          const shd = tcPr['w:shd']
          if (shd) {
            const fill = shd['@_w:fill']
            if (fill && fill !== 'auto') {
              cellStyle.push(`background-color: #${fill}`)
            }
          }
        }

        // 处理单元格内容
        let cellContent = ''
        const cellParas = cell['w:p']
        if (cellParas) {
          const parasList = Array.isArray(cellParas) ? cellParas : [cellParas]
          for (const para of parasList) {
            const runs = para['w:r']
            if (runs) {
              const runsList = Array.isArray(runs) ? runs : [runs]
              for (const run of runsList) {
                cellContent += convertRunToHtml(run, stylesMap, imageMap)
              }
            }
            const hyperlink = para['w:hyperlink']
            if (hyperlink) {
              const hyperlinkList = Array.isArray(hyperlink) ? hyperlink : [hyperlink]
              for (const linkItem of hyperlinkList) {
                const hyperlinkRuns = linkItem?.['w:r']
                if (!hyperlinkRuns) continue
                const runsList = Array.isArray(hyperlinkRuns) ? hyperlinkRuns : [hyperlinkRuns]
                let linkContent = ''
                for (const run of runsList) {
                  linkContent += convertRunToHtml(run, stylesMap, imageMap)
                }
                const linkId = linkItem?.['@_r:id']
                const anchor = linkItem?.['@_w:anchor']
                const href = linkId ? hyperlinkMap?.get(linkId) : anchor ? `#${anchor}` : ''
                if (href) {
                  cellContent += `<a href="${href}">${linkContent}</a>`
                } else {
                  cellContent += linkContent
                }
              }
            }
          }
        }

        html += `<td style="${cellStyle.join('; ')}">${cellContent || '&nbsp;'}</td>`
      }
    }
    html += '</tr>'
  }

  html += '</table>'
  return html
}

/**
 * 增强的 OOXML 解析 - Worker 版本
 */
async function parseOoxmlDocumentWorker(
  arrayBuffer: ArrayBuffer,
  onProgress: ProgressCallback
): Promise<string> {
  const JSZip = (await import('jszip')).default
  const { XMLParser } = await import('fast-xml-parser')

  onProgress(10, '正在解压文档...')
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. 解析列表样式（保留用于未来扩展）
  onProgress(20, '正在解析列表样式...')
  await parseNumberingXml(zip)

  // 2. 解析文档样式
  onProgress(30, '正在解析文档样式...')
  const stylesMap = await parseStylesXmlEnhanced(zip)

  // 3. 解析字体信息（保留用于未来扩展）
  onProgress(40, '正在解析字体信息...')
  await parseFontTableXml(zip)

  // 4. 处理图片
  onProgress(50, '正在处理图片...')
  const imageMap = await processAllImages(zip)

  // 4.1 处理超链接
  const hyperlinkMap = await processAllHyperlinks(zip)

  // 5. 解析文档内容
  onProgress(60, '正在解析文档内容...')
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) {
    throw new Error('未找到文档内容')
  }

  const documentXml = await documentFile.async('string')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: true
  })

  const docObj = parser.parse(documentXml)

  onProgress(70, '正在生成 HTML...')

  // 获取文档体
  let body = docObj?.['w:document']?.['w:body']
  if (!body) {
    body = docObj?.['document']?.['body']
    if (!body) {
      const findBody = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null
        for (const key of Object.keys(obj)) {
          if (key.includes('body') || key.includes('Body')) {
            return obj[key]
          }
          const found = findBody(obj[key])
          if (found) return found
        }
        return null
      }
      body = findBody(docObj)
    }
  }

  if (!body) {
    throw new Error('文档结构错误')
  }

  // 遍历所有元素
  const elements: string[] = []

  const processBodyElements = (bodyContent: any) => {
    if (Array.isArray(bodyContent)) {
      for (const item of bodyContent) {
        if (item['w:p'] !== undefined) {
          elements.push(convertParagraphToHtml(item, stylesMap, imageMap, hyperlinkMap))
        } else if (item['w:tbl'] !== undefined) {
          elements.push(convertTableToHtml(item['w:tbl'], stylesMap, imageMap, hyperlinkMap))
        }
      }
      return
    }

    const paragraphs = bodyContent['w:p']
    if (paragraphs) {
      const paraList = Array.isArray(paragraphs) ? paragraphs : [paragraphs]
      for (const para of paraList) {
        elements.push(convertParagraphToHtml(para, stylesMap, imageMap, hyperlinkMap))
      }
    }

    const tables = bodyContent['w:tbl']
    if (tables) {
      const tableList = Array.isArray(tables) ? tables : [tables]
      for (const table of tableList) {
        elements.push(convertTableToHtml(table, stylesMap, imageMap, hyperlinkMap))
      }
    }
  }

  processBodyElements(body)

  onProgress(90, '正在优化格式...')

  let html = elements.join('\n')

  // 清理空的 span
  html = html.replace(/<span>\s*<\/span>/g, '')
  html = html.replace(/<span style="">\s*<\/span>/g, '')

  // 移除多余空段落
  html = html.replace(/(<p[^>]*>\s*<br>\s*<\/p>\s*){2,}/g, '<p><br></p>')

  onProgress(100, '解析完成')

  return html
}

// Web Worker 入口
self.onmessage = async (e: MessageEvent) => {
  const { arrayBuffer, method } = e.data

  try {
    // 发送进度更新
    const onProgress = (progress: number, text: string) => {
      self.postMessage({ type: 'progress', progress, text })
    }

    let html: string

    if (method === 'docx-preview') {
      // docx-preview 需要 DOM，Worker 中无法直接使用
      self.postMessage({ type: 'fallback', reason: 'need-dom' })
      return
    } else {
      // 使用增强 OOXML 解析（纯 JS，可在 Worker 中运行）
      html = await parseOoxmlDocumentWorker(arrayBuffer, onProgress)
    }

    self.postMessage({ type: 'success', html })
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message })
  }
}

// 标记为 Worker
export {}
