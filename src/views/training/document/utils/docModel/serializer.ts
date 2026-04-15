import type {
  DocBlock,
  DocBlockquoteBlock,
  DocCodeBlock,
  DocHeadingBlock,
  DocHtmlBlock,
  DocListBlock,
  DocModel,
  DocParagraphBlock,
  DocRun,
  ParagraphStyle,
  RunStyle
} from './types'
import { getFontWithFallback, normalizeColor } from '../wordParser.shared'

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const escapeAttr = (value: string): string => {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

const styleToCssText = (style: RunStyle | undefined): string => {
  if (!style) return ''
  const css: string[] = []
  if (style.fontFamily) {
    // 输出时自动补全字体 fallback 链，确保跨平台显示一致
    const fontWithFallback = getFontWithFallback(style.fontFamily.replace(/['"]/g, ''))
    css.push(`font-family: ${fontWithFallback}`)
  }
  if (style.fontSize) css.push(`font-size: ${style.fontSize}px`)
  if (style.color) {
    const normalized = normalizeColor(style.color)
    if (normalized) css.push(`color: ${normalized}`)
  }
  if (style.backgroundColor) {
    const normalized = normalizeColor(style.backgroundColor)
    if (normalized) css.push(`background-color: ${normalized}`)
  }
  if (style.bold) css.push('font-weight: bold')
  if (style.italic) css.push('font-style: italic')
  if (style.underline) css.push('text-decoration: underline')
  if (style.strike) css.push('text-decoration: line-through')
  if (style.superscript) css.push('vertical-align: super; font-size: 0.8em')
  if (style.subscript) css.push('vertical-align: sub; font-size: 0.8em')
  return css.join('; ')
}

const renderTextWithBreaks = (text: string): string => {
  const parts = text.split(/\r?\n/)
  const escaped = parts.map((part) => escapeHtml(part))
  return escaped.join('<br />')
}

const serializeRun = (run: DocRun): string => {
  if (run.image) {
    const img = run.image
    const resolvedSrc = img.originSrc || img.src
    const attrs: string[] = [`src="${escapeAttr(resolvedSrc)}"`, 'class="editor-image"', 'data-display="inline"']
    if (img.originSrc) attrs.push(`data-origin-src="${escapeAttr(img.originSrc)}"`)
    if (img.alt) attrs.push(`alt="${escapeHtml(img.alt)}"`)
    if (img.width) attrs.push(`width="${img.width}"`)
    if (img.height) attrs.push(`height="${img.height}"`)
    if (img.cropTop) attrs.push(`data-crop-top="${img.cropTop}"`)
    if (img.cropRight) attrs.push(`data-crop-right="${img.cropRight}"`)
    if (img.cropBottom) attrs.push(`data-crop-bottom="${img.cropBottom}"`)
    if (img.cropLeft) attrs.push(`data-crop-left="${img.cropLeft}"`)
    attrs.push('style="display: inline-block; vertical-align: bottom;"')
    return `<img ${attrs.join(' ')} />`
  }
  if (run.footnoteId) {
    const id = run.footnoteId
    return `<sup data-docx-footnote="${id}">${id}</sup>`
  }
  if (run.endnoteId) {
    const id = run.endnoteId
    return `<sup data-docx-endnote="${id}">${id}</sup>`
  }
  const text = renderTextWithBreaks(run.text || '')
  let effectiveStyle = run.style
  if (run.style?.link && !run.style?.color) {
    effectiveStyle = { ...run.style, color: '#0563C1' }
  }
  const styleText = styleToCssText(effectiveStyle)
  const content = styleText ? `<span style="${styleText}">${text}</span>` : text
  if (run.style?.link) {
    return `<a href="${escapeAttr(run.style.link)}">${content}</a>`
  }
  return content
}

const paragraphStyleToCssText = (style: ParagraphStyle | undefined): string => {
  if (!style) return ''
  const css: string[] = []
  if (style.align) css.push(`text-align: ${style.align}`)
  if (style.indentLeft) css.push(`margin-left: ${style.indentLeft}px`)
  if (style.indentRight) css.push(`margin-right: ${style.indentRight}px`)
  if (style.indentFirstLine) css.push(`text-indent: ${style.indentFirstLine}px`)
  if (style.lineHeight) css.push(`line-height: ${style.lineHeight}px`)
  if (style.spaceBefore) css.push(`margin-top: ${style.spaceBefore}px`)
  if (style.spaceAfter) css.push(`margin-bottom: ${style.spaceAfter}px`)
  return css.join('; ')
}

const serializeParagraph = (block: DocParagraphBlock): string => {
  const runs = block.runs.map(serializeRun).join('')
  const styleText = paragraphStyleToCssText(block.style)
  if (!styleText) return `<p>${runs || '&nbsp;'}</p>`
  return `<p style="${styleText}">${runs || '&nbsp;'}</p>`
}

const serializeHeading = (block: DocHeadingBlock): string => {
  const runs = block.runs.map(serializeRun).join('')
  const styleText = paragraphStyleToCssText(block.style)
  const tag = `h${block.level}`
  if (!styleText) return `<${tag}>${runs || '&nbsp;'}</${tag}>`
  return `<${tag} style="${styleText}">${runs || '&nbsp;'}</${tag}>`
}

const serializeList = (block: DocListBlock): string => {
  const tag = block.kind === 'ordered' ? 'ol' : 'ul'
  const listAttrs = block.kind === 'task' ? ' data-type="taskList"' : ''
  const items = block.items
    .map((item) => {
      const itemAttrs =
        block.kind === 'task'
          ? ` data-type="taskItem" data-checked="${item.checked ? 'true' : 'false'}"`
          : ''
      const itemHtml = item.blocks.map(serializeBlock).join('') || '<p></p>'
      return `<li${itemAttrs}>${itemHtml}</li>`
    })
    .join('')
  return `<${tag}${listAttrs}>${items}</${tag}>`
}

const serializeBlockquote = (block: DocBlockquoteBlock): string => {
  const content = block.blocks.map(serializeBlock).join('') || '<p></p>'
  return `<blockquote>${content}</blockquote>`
}

const serializeCodeBlock = (block: DocCodeBlock): string => {
  const text = escapeHtml(block.text || '')
  return `<pre><code>${text}</code></pre>`
}

const serializeBlock = (block: DocBlock): string => {
  if (block.type === 'html') {
    return (block as DocHtmlBlock).html
  }
  if (block.type === 'paragraph') {
    return serializeParagraph(block)
  }
  if (block.type === 'heading') {
    return serializeHeading(block)
  }
  if (block.type === 'list') {
    return serializeList(block)
  }
  if (block.type === 'blockquote') {
    return serializeBlockquote(block)
  }
  if (block.type === 'code') {
    return serializeCodeBlock(block)
  }
  if (block.type === 'pageBreak') {
    return '<hr data-page-break="true" />'
  }
  if (block.type === 'image') {
    const resolvedSrc = block.originSrc || block.src
    const attrs: string[] = [`src="${escapeAttr(resolvedSrc)}"`, 'class="editor-image"', 'data-display="block"']
    if (block.originSrc && block.originSrc !== resolvedSrc) {
      attrs.push(`data-origin-src="${escapeAttr(block.originSrc)}"`)
    }
    if (block.alt) attrs.push(`alt="${escapeHtml(block.alt)}"`)
    if (block.width) attrs.push(`width="${block.width}"`)
    if (block.height) attrs.push(`height="${block.height}"`)
    if (block.cropTop) attrs.push(`data-crop-top="${block.cropTop}"`)
    if (block.cropRight) attrs.push(`data-crop-right="${block.cropRight}"`)
    if (block.cropBottom) attrs.push(`data-crop-bottom="${block.cropBottom}"`)
    if (block.cropLeft) attrs.push(`data-crop-left="${block.cropLeft}"`)
    const align = block.style?.align || 'center'
    attrs.push(`data-align="${align}"`)
    const styleParts: string[] = ['display: block']
    if (align === 'center') {
      styleParts.push('margin-left: auto', 'margin-right: auto')
    } else if (align === 'right') {
      styleParts.push('margin-left: auto', 'margin-right: 0')
    } else {
      styleParts.push('margin-right: auto', 'margin-left: 0')
    }
    if (block.style?.marginTop !== undefined)
      styleParts.push(`margin-top: ${block.style.marginTop}px`)
    if (block.style?.marginBottom !== undefined)
      styleParts.push(`margin-bottom: ${block.style.marginBottom}px`)
    attrs.push(`style="${styleParts.join('; ')}"`)
    return `<img ${attrs.join(' ')} />`
  }
  if (block.type === 'table') {
    const tableWidth = block.tableWidth || block.minWidth
    const styleParts: string[] = []
    if (tableWidth) {
      styleParts.push(`width: ${tableWidth}px`, `min-width: ${tableWidth}px`)
    } else if (block.minWidth) {
      styleParts.push(`min-width: ${block.minWidth}px`)
    }
    const tableStyle = styleParts.length ? ` style="${styleParts.join('; ')};"` : ''
    const tableWidthAttr = tableWidth ? ` data-table-width="${Math.round(tableWidth)}"` : ''
    const colgroup =
      block.colWidths?.length && block.colWidths.some(w => w > 0)
        ? `<colgroup>${block.colWidths
            .map((width) => `<col style="width: ${width}px" width="${width}">`)
            .join('')}</colgroup>`
        : ''
    const colCount = block.colWidths?.length || 0
    const rowspanTracker: number[] = new Array(colCount).fill(0)
    const rows = block.rows
      .map((row) => {
        let colIdx = 0
        const cells = row.cells
          .map((cell) => {
            while (colIdx < rowspanTracker.length && rowspanTracker[colIdx] > 0) {
              rowspanTracker[colIdx]--
              colIdx++
            }
            const cellHtml = cell.blocks.map(serializeBlock).join('') || '<p></p>'
            const attrs: string[] = []
            if (cell.colspan) attrs.push(`colspan="${cell.colspan}"`)
            if (cell.rowspan) attrs.push(`rowspan="${cell.rowspan}"`)
            const span = cell.colspan || 1
            if (block.colWidths && block.colWidths.length) {
              const widths: number[] = []
              for (let i = 0; i < span; i++) {
                widths.push(block.colWidths[colIdx + i] || 0)
              }
              if (widths.some(w => w > 0)) attrs.push(`colwidth="${widths.join(',')}"`)
            }
            if (cell.rowspan && cell.rowspan > 1) {
              for (let i = 0; i < span; i++) {
                if (colIdx + i < rowspanTracker.length)
                  rowspanTracker[colIdx + i] = cell.rowspan - 1
              }
            }
            colIdx += span
            const styleParts: string[] = []
            if (cell.backgroundColor) styleParts.push(`background-color: ${cell.backgroundColor}`)
            if (cell.textAlign) styleParts.push(`text-align: ${cell.textAlign}`)
            if (cell.verticalAlign) styleParts.push(`vertical-align: ${cell.verticalAlign}`)
            if (styleParts.length) attrs.push(`style="${styleParts.join('; ')}"`)
            const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
            return `<td${attrStr}>${cellHtml}</td>`
          })
          .join('')
        while (colIdx < rowspanTracker.length) {
          if (rowspanTracker[colIdx] > 0) rowspanTracker[colIdx]--
          colIdx++
        }
        const trStyle = row.height ? ` style="height: ${row.height}px"` : ''
        return `<tr${trStyle}>${cells}</tr>`
      })
      .join('')
    return `<table${tableWidthAttr}${tableStyle}>${colgroup}<tbody>${rows}</tbody></table>`
  }
  return ''
}

export const serializeDocModelToHtml = (model: DocModel): string => {
  const parts: string[] = []
  if (model.headers?.length) {
    model.headers.forEach((section) => {
      const headerHtml = section.blocks.map(serializeBlock).join('')
      if (headerHtml.trim()) parts.push(`<header data-docx="header">${headerHtml}</header>`)
    })
  }
  parts.push(...model.blocks.map(serializeBlock))
  if (model.footnotes?.length) {
    model.footnotes.forEach((note, index) => {
      const id = note.id ?? index + 1
      const noteHtml = note.blocks.map(serializeBlock).join('')
      if (noteHtml.trim()) {
        parts.push(`<aside data-docx="footnote" data-id="${id}">${noteHtml}</aside>`)
      }
    })
  }
  if (model.endnotes?.length) {
    model.endnotes.forEach((note, index) => {
      const id = note.id ?? index + 1
      const noteHtml = note.blocks.map(serializeBlock).join('')
      if (noteHtml.trim()) {
        parts.push(`<aside data-docx="endnote" data-id="${id}">${noteHtml}</aside>`)
      }
    })
  }
  if (model.footers?.length) {
    model.footers.forEach((section) => {
      const footerHtml = section.blocks.map(serializeBlock).join('')
      if (footerHtml.trim()) parts.push(`<footer data-docx="footer">${footerHtml}</footer>`)
    })
  }
  return parts.join('')
}
