/**
 * 表格 HTML 归一化：Word 导入与从存储重新打开编辑器共用。
 * 列宽按比例拉伸到正文区宽度，消除 ProseMirror 内右侧留白。
 */

/** 列宽按比例缩放到 targetSum（放大或缩小均可） */
const scaleColWidthsToTargetSum = (widths: number[], targetSum: number, minW = 25): number[] => {
  if (!widths.length || targetSum <= 0) return widths
  const sum = widths.reduce((a, b) => a + b, 0)
  if (sum <= 0 || Math.abs(sum - targetSum) <= 2) return widths
  const scaled = widths.map((w) => Math.max(minW, Math.round((w * targetSum) / sum)))
  const drift = targetSum - scaled.reduce((a, b) => a + b, 0)
  if (drift !== 0) {
    const li = scaled.length - 1
    scaled[li] = Math.max(minW, scaled[li] + drift)
  }
  return scaled
}

/**
 * 从 ProseMirror 根节点向上找正文容器（与 `.page-content` / `.tiptap-content` 内边距一致的可视宽度）
 */
export const resolveEditorTableBodyWidth = (
  prosemirrorRoot?: HTMLElement | null
): number | undefined => {
  try {
    if (typeof window === 'undefined' || !prosemirrorRoot) return undefined
    const pageContent = prosemirrorRoot.closest('.page-content') as HTMLElement | null
    const tiptapContent = prosemirrorRoot.closest('.tiptap-content') as HTMLElement | null
    const el = pageContent || tiptapContent
    if (!el) return undefined
    const cs = window.getComputedStyle(el)
    const pl = parseFloat(cs.paddingLeft || '0') || 0
    const pr = parseFloat(cs.paddingRight || '0') || 0
    const inner = Math.floor(el.clientWidth - pl - pr)
    return inner >= 160 ? inner : undefined
  } catch {
    return undefined
  }
}

export const normalizeTableStructureForImport = (
  html: string,
  importBodyWidth?: number
): string => {
  if (!html || !/<table[\s>]/i.test(html)) return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<div id="word-import-normalize-root">${html}</div>`,
      'text/html'
    )
    const root = doc.getElementById('word-import-normalize-root')
    if (!root) return html

    const tables = root.querySelectorAll('table')
    tables.forEach((table) => {
      ;(table as HTMLElement).setAttribute('data-imported-table', 'true')
      const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[]
      if (!rows.length) return

      const occupancy: boolean[][] = []
      let maxCols = 0

      rows.forEach((row, rowIndex) => {
        if (!occupancy[rowIndex]) occupancy[rowIndex] = []
        let colIndex = 0
        const cells = Array.from(row.children).filter((cell) =>
          /^(td|th)$/i.test(cell.tagName)
        ) as HTMLElement[]
        for (const cell of cells) {
          while (occupancy[rowIndex][colIndex]) colIndex += 1
          const colSpan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1)
          const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1)
          for (let r = 0; r < rowSpan; r++) {
            const targetRow = rowIndex + r
            if (!occupancy[targetRow]) occupancy[targetRow] = []
            for (let c = 0; c < colSpan; c++) {
              occupancy[targetRow][colIndex + c] = true
            }
          }
          colIndex += colSpan
        }
        maxCols = Math.max(maxCols, occupancy[rowIndex].length)
      })

      if (maxCols <= 0) return

      rows.forEach((row, rowIndex) => {
        if (!occupancy[rowIndex]) occupancy[rowIndex] = []
        let missing = 0
        for (let col = 0; col < maxCols; col++) {
          if (!occupancy[rowIndex][col]) missing += 1
        }
        for (let i = 0; i < missing; i++) {
          const filler = doc.createElement('td')
          filler.innerHTML = '<br>'
          filler.setAttribute('data-imported-cell', 'true')
          row.appendChild(filler)
        }
      })

      let colgroup = table.querySelector('colgroup')
      if (!colgroup) {
        colgroup = doc.createElement('colgroup')
        table.insertBefore(colgroup, table.firstChild)
      }
      const cols = Array.from(colgroup.querySelectorAll('col'))
      if (cols.length < maxCols) {
        for (let i = cols.length; i < maxCols; i++) colgroup.appendChild(doc.createElement('col'))
      } else if (cols.length > maxCols) {
        cols.slice(maxCols).forEach((col) => col.remove())
      }

      const normalizedCols = Array.from(colgroup.querySelectorAll('col')) as HTMLElement[]
      const parsePx = (value: string | null | undefined): number => {
        if (!value) return 0
        const str = String(value)
        const match = str.match(/([\d.]+)\s*px/i)
        if (match) return Math.round(parseFloat(match[1]))
        const num = parseFloat(str)
        return !Number.isNaN(num) && num > 0 ? Math.round(num) : 0
      }
      const parseStyleWidthPx = (style: string | null | undefined): number => {
        if (!style) return 0
        const m = String(style).match(/(?:^|;)\s*width\s*:\s*([\d.]+)px/i)
        return m ? Math.round(parseFloat(m[1])) : 0
      }
      const explicitWidths = normalizedCols.map((col) => {
        const fromStyle =
          parsePx(col.style.width) ||
          parsePx(col.style.minWidth) ||
          parsePx(col.getAttribute('width'))
        return fromStyle > 4 ? fromStyle : 0
      })
      const hasCollapsedWidth = explicitWidths.some((width) => width > 0 && width <= 4)
      const hasMissingWidth = explicitWidths.some((width) => width === 0)
      if (hasCollapsedWidth || hasMissingWidth) {
        const tableRectWidth = Math.round((table as HTMLElement).getBoundingClientRect().width || 0)
        const fallbackWidth = Math.max(80, Math.floor((tableRectWidth || 640) / maxCols))
        normalizedCols.forEach((col, index) => {
          const width = explicitWidths[index] > 4 ? explicitWidths[index] : fallbackWidth
          col.style.width = `${width}px`
          col.style.minWidth = `${width}px`
        })
      }

      const normalizedColWidths = normalizedCols.map((col) => {
        const width =
          parsePx(col.style.width) ||
          parsePx(col.style.minWidth) ||
          parsePx(col.getAttribute('width'))
        return Math.max(25, width || 25)
      })

      let colWidthsForCells = normalizedColWidths

      if (importBodyWidth && importBodyWidth > 0) {
        const sum0 = colWidthsForCells.reduce((a, b) => a + b, 0)
        const tableEl = table as HTMLElement
        const existingTableWidth = parsePx(tableEl.getAttribute('data-table-width'))
          || parseStyleWidthPx(tableEl.getAttribute('style'))
        const hasExplicitWidth = existingTableWidth > 0
        const shouldScale = hasExplicitWidth
          ? sum0 > importBodyWidth + 2
          : sum0 > 0 && Math.abs(sum0 - importBodyWidth) > 2

        if (shouldScale) {
          const target = hasExplicitWidth && sum0 <= importBodyWidth
            ? sum0
            : importBodyWidth
          colWidthsForCells = scaleColWidthsToTargetSum(colWidthsForCells, target)
          normalizedCols.forEach((col, index) => {
            const w = colWidthsForCells[index]
            if (w === undefined) return
            col.style.width = `${w}px`
            col.style.minWidth = `${w}px`
            col.setAttribute('width', String(w))
          })
        }
      }

      const occupiedUntil = Array.from({ length: maxCols }, () => 0)
      rows.forEach((row, rowIndex) => {
        let colIndex = 0
        const cells = Array.from(row.children).filter((cell) =>
          /^(td|th)$/i.test(cell.tagName)
        ) as HTMLElement[]
        for (const cell of cells) {
          cell.setAttribute('data-imported-cell', 'true')
          if (!cell.innerHTML.trim()) {
            cell.innerHTML = '<br>'
          }
          while (colIndex < maxCols && occupiedUntil[colIndex] > rowIndex) colIndex += 1
          if (colIndex >= maxCols) break
          const colSpan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1)
          const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1)
          const usedSpan = Math.min(colSpan, maxCols - colIndex)
          const colwidthValues = colWidthsForCells.slice(colIndex, colIndex + usedSpan)
          if (colwidthValues.length) {
            const colwidthText = colwidthValues.join(',')
            cell.setAttribute('data-colwidth', colwidthText)
            cell.setAttribute('colwidth', colwidthText)
            if (usedSpan === 1) {
              const width = colwidthValues[0]
              cell.style.width = `${width}px`
              cell.style.minWidth = `${width}px`
            }
          }
          for (let i = 0; i < usedSpan; i++) {
            occupiedUntil[colIndex + i] = Math.max(occupiedUntil[colIndex + i], rowIndex + rowSpan)
          }
          colIndex += usedSpan
        }
      })

      const ensureBlockInCell = (cell: HTMLElement) => {
        const hasBlockChild = cell.querySelector(
          'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, div[data-type="paragraph"]'
        )
        if (hasBlockChild) return
        const hasImg = cell.querySelector('img')
        if (hasImg) return
        const raw = cell.innerHTML.trim()
        if (!raw) {
          cell.innerHTML = '<p><br></p>'
          return
        }
        const p = doc.createElement('p')
        p.innerHTML = cell.innerHTML
        cell.innerHTML = ''
        cell.appendChild(p)
      }
      table.querySelectorAll('td, th').forEach((cell) => {
        ensureBlockInCell(cell as HTMLElement)
      })

      const colWidthSum = colWidthsForCells.reduce((sum, w) => sum + w, 0)
      if (colWidthSum > 0) {
        const tableEl = table as HTMLElement
        tableEl.setAttribute('data-table-width', String(colWidthSum))
        tableEl.style.width = `${colWidthSum}px`
        tableEl.style.minWidth = `${colWidthSum}px`
      }
    })

    return root.innerHTML
  } catch (e) {
    console.warn('normalizeTableStructureForImport failed:', e)
    return html
  }
}
