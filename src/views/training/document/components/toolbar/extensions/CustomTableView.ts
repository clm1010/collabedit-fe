import { TableView } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

const MIN_TABLE_WIDTH = 160
const MIN_TABLE_HEIGHT = 80
const MIN_ROW_HEIGHT = 30
const TABLE_BORDER_EPSILON = 1

interface DragState {
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  colWidths: number[]
  rowHeights: number[]
  moved: boolean
  scrollContainer: HTMLElement | null
  scrollTop: number
  scrollLeft: number
  lastWidth: number
  lastHeight: number
  lastDeltaX: number
  lastDeltaY: number
}

export class CustomTableView extends TableView {
  private readonly _view?: EditorView
  private readonly _handle: HTMLDivElement
  private _dragState: DragState | null = null
  private readonly _onMouseMove: (event: MouseEvent) => void
  private readonly _onMouseUp: () => void
  private readonly _scaleEnabled: boolean
  private _lockedScrollContainer: HTMLElement | null = null
  private _lockedOverflowX = ''
  private _lockedOverflowY = ''

  constructor(node: ProseMirrorNode, cellMinWidth: number, view?: EditorView) {
    super(node, cellMinWidth)
    this._view = view || (this as any).view
    this._scaleEnabled = this.isScaleEnabled()

    this.dom.classList.add('custom-table-view')
    this.dom.style.overflow = 'visible'
    this.dom.style.width = 'fit-content'
    this.dom.style.maxWidth = '100%'

    this._handle = document.createElement('div')
    this._handle.className = 'table-scale-handle'
    this._handle.title = '拖拽调整表格大小'
    this._handle.style.touchAction = 'none'
    this._handle.style.userSelect = 'none'

    this._onMouseMove = (event: MouseEvent) => this.handleDragMove(event)
    this._onMouseUp = () => this.handleDragEnd()

    this._handle.addEventListener('mousedown', (event: MouseEvent) => this.handleDragStart(event), true)
    this.dom.appendChild(this._handle)
    this.applyNodeAttrs(node)
    this.syncHandleVisibility()
  }

  update(node: ProseMirrorNode) {
    const result = super.update(node)
    if (!result) return result
    if (this._dragState && this._dragState.moved) {
      const nextWidths = this.distributeScale(this._dragState.colWidths, this._dragState.lastWidth, this.cellMinWidth)
      const nextHeights = this.distributeScale(this._dragState.rowHeights, this._dragState.lastHeight, MIN_ROW_HEIGHT)
      this.applyWidths(nextWidths)
      this.applyRowHeights(nextHeights)
    } else {
      this.applyNodeAttrs(node)
    }
    this.syncHandleVisibility()
    return result
  }

  destroy() {
    this.detachDocumentListeners()
    this._handle.remove()
    this.dom.classList.remove('is-table-scaling')
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(this))
    if (typeof proto.destroy === 'function') proto.destroy.call(this)
  }

  private getColWidths(): number[] {
    const cols = Array.from(this.colgroup.children) as HTMLElement[]
    if (cols.length === 0) return []

    const styledWidths = cols.map((col) => {
      const width =
        parseInt(col.style.width, 10) || parseInt(col.style.minWidth, 10) || this.cellMinWidth
      return Math.max(this.cellMinWidth, width)
    })

    const tableWidth = Math.round(this.table.getBoundingClientRect().width || 0)
    const styledTotal = styledWidths.reduce((sum, current) => sum + current, 0)
    const allUseFallback = styledWidths.every((width) => width === this.cellMinWidth)

    // 某些导入表格 colgroup 无显式宽度，直接用渲染宽度避免点击后瞬间缩到最小宽。
    if (allUseFallback || Math.abs(styledTotal - tableWidth) > cols.length * 8) {
      const measured = this.getMeasuredColWidths(cols.length)
      if (measured.length === cols.length) return measured
    }


    return styledWidths
  }

  private getMeasuredColWidths(expectedCols: number): number[] {
    if (expectedCols <= 0) return []
    const rows = this.getRows()
    if (!rows.length) return []

    const widths = Array.from({ length: expectedCols }, () => this.cellMinWidth)
    const occupiedUntil = Array.from({ length: expectedCols }, () => 0)

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      let colIndex = 0
      const cells = Array.from(rows[rowIndex].children) as HTMLElement[]
      for (const cell of cells) {
        while (colIndex < expectedCols && occupiedUntil[colIndex] > rowIndex) colIndex += 1
        if (colIndex >= expectedCols) break
        const span = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1)
        const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1)
        const usedSpan = Math.min(span, expectedCols - colIndex)
        const cellWidth = Math.max(
          this.cellMinWidth,
          Math.round(cell.getBoundingClientRect().width / usedSpan)
        )
        for (let i = 0; i < usedSpan; i++) {
          widths[colIndex + i] = Math.max(this.cellMinWidth, cellWidth)
          occupiedUntil[colIndex + i] = Math.max(occupiedUntil[colIndex + i], rowIndex + rowSpan)
        }
        colIndex += usedSpan
      }
    }
    return widths
  }

  private getRows(): HTMLTableRowElement[] {
    return Array.from(this.table.querySelectorAll('tr')) as HTMLTableRowElement[]
  }

  /** 各行展开 colspan 后的最大列数；首行曾为合并单元格时仅用首行会得到 0 或偏小 */
  private getLogicalColCountFromDom(): number {
    const rows = this.getRows()
    if (!rows.length) return 0
    let max = 0
    for (const row of rows) {
      let sum = 0
      for (const cell of Array.from(row.children)) {
        if (!/^(TD|TH)$/i.test(cell.tagName)) continue
        const cs = Math.max(1, parseInt((cell as HTMLElement).getAttribute('colspan') || '1', 10) || 1)
        sum += cs
      }
      max = Math.max(max, sum)
    }
    return max
  }

  private buildSyntheticColWidths(colCount: number): number[] {
    if (colCount <= 0) return []
    const tw = Math.max(
      MIN_TABLE_WIDTH,
      Math.round(this.table.getBoundingClientRect().width) ||
        colCount * this.cellMinWidth
    )
    const base = Math.max(this.cellMinWidth, Math.floor(tw / colCount))
    const widths = Array.from({ length: colCount }, () => base)
    const drift = tw - widths.reduce((a, b) => a + b, 0)
    if (drift !== 0 && widths.length) {
      widths[widths.length - 1] = Math.max(this.cellMinWidth, widths[widths.length - 1] + drift)
    }
    return widths
  }

  private syncHandleVisibility() {
    const editable = this.dom.closest('.ProseMirror')?.getAttribute('contenteditable') === 'true'
    this._handle.style.display = editable && this._scaleEnabled ? 'block' : 'none'
  }

  private applyWidths(colWidths: number[]) {
    if (!colWidths.length) return
    const cols = Array.from(this.colgroup.children) as HTMLElement[]
    if (cols.length === colWidths.length && cols.length > 0) {
      cols.forEach((col, index) => {
        const width = Math.max(this.cellMinWidth, Math.round(colWidths[index]!))
        col.style.width = `${width}px`
        col.style.minWidth = `${width}px`
      })
    }
    const tableWidth = colWidths.reduce(
      (sum, current) => sum + Math.max(this.cellMinWidth, Math.round(current)),
      0
    )
    if (tableWidth > 0) {
      this.table.style.width = `${Math.round(tableWidth)}px`
      this.table.style.minWidth = ''
    }
  }

  private applyRowHeights(rowHeights: number[]) {
    const rows = this.getRows()
    if (rows.length === 0 || rowHeights.length === 0) return
    const len = Math.min(rows.length, rowHeights.length)
    for (let index = 0; index < len; index++) {
      const height = Math.max(MIN_ROW_HEIGHT, Math.round(rowHeights[index]))
      const row = rows[index]
      row.style.height = `${height}px`
      const cells = Array.from(row.children) as HTMLElement[]
      cells.forEach((cell) => {
        cell.style.height = `${height}px`
        cell.style.minHeight = `${height}px`
      })
    }
  }

  private distributeScale(values: number[], targetTotal: number, minValue: number): number[] {
    if (!values.length) return values
    const currentTotal = values.reduce((sum, current) => sum + current, 0)
    if (currentTotal <= 0) return values
    const minTotal = values.length * minValue
    const clampedTarget = Math.max(minTotal, targetTotal)
    const scale = clampedTarget / currentTotal
    const scaled = values.map((value) => Math.max(minValue, value * scale))
    const next = scaled.map((value) => Math.floor(value))
    let remainder = Math.max(
      0,
      Math.round(clampedTarget - next.reduce((sum, current) => sum + current, 0))
    )
    // 余数按末尾优先分配，保证小幅拖拽也能看到行高联动
    for (let i = next.length - 1; i >= 0 && remainder > 0; i--) {
      next[i] += 1
      remainder -= 1
    }
    return next
  }

  private getBoundaryBox() {
    const pageContent = this.dom.closest('.page-content') as HTMLElement | null
    if (!pageContent) return null

    const style = window.getComputedStyle(pageContent)
    const paddingLeft = parseFloat(style.paddingLeft || '0') || 0
    const paddingRight = parseFloat(style.paddingRight || '0') || 0
    const paddingTop = parseFloat(style.paddingTop || '0') || 0
    const paddingBottom = parseFloat(style.paddingBottom || '0') || 0

    const contentWidth = pageContent.clientWidth - paddingLeft - paddingRight
    const contentHeight = pageContent.clientHeight - paddingTop - paddingBottom
    const scrollHeight = pageContent.scrollHeight - paddingTop - paddingBottom
    const pageRect = pageContent.getBoundingClientRect()
    const tableRect = this.table.getBoundingClientRect()

    const relativeTop = Math.max(0, tableRect.top - (pageRect.top + paddingTop))
    const effectiveHeight = Math.max(contentHeight, scrollHeight)
    const maxHeight = Math.max(MIN_TABLE_HEIGHT, Math.floor(effectiveHeight - relativeTop))
    const maxWidth = Math.max(MIN_TABLE_WIDTH, Math.floor(contentWidth))

    return {
      maxWidth: Math.max(MIN_TABLE_WIDTH, maxWidth - TABLE_BORDER_EPSILON),
      maxHeight: Math.max(MIN_TABLE_HEIGHT, maxHeight - TABLE_BORDER_EPSILON)
    }
  }

  private isScaleEnabled() {
    if (typeof window === 'undefined') return true
    // 回退开关：localStorage 设置 editor.tableScaleEnabled=0 时禁用整体缩放
    return window.localStorage.getItem('editor.tableScaleEnabled') !== '0'
  }

  private applyTableWidth(width: number) {
    const rounded = Math.round(width)
    this.table.style.width = `${rounded}px`
    this.table.style.minWidth = ''
    this.table.setAttribute('data-table-width', String(rounded))
  }

  private handleDragStart(event: MouseEvent) {
    if (!this._scaleEnabled) return
    if (event.button !== 0) return
    event.preventDefault()
    event.stopImmediatePropagation()

    const rows = this.getRows()
    if (!rows.length) return

    let colWidthsDrag = this.getColWidths()
    if (!colWidthsDrag.length) {
      const n = this.getLogicalColCountFromDom()
      if (n <= 0) return
      colWidthsDrag = this.buildSyntheticColWidths(n)
    }

    const rowHeightsDrag = rows.map((tr) =>
      Math.max(MIN_ROW_HEIGHT, Math.round(tr.getBoundingClientRect().height))
    )
    if (!rowHeightsDrag.length) return

    const currentWidthSum = colWidthsDrag.reduce((sum, width) => sum + width, 0)
    const startWidth = Math.max(
      MIN_TABLE_WIDTH,
      Math.round(this.table.getBoundingClientRect().width || currentWidthSum)
    )
    const normalizedColWidths =
      currentWidthSum > 0 && Math.abs(currentWidthSum - startWidth) > colWidthsDrag.length * 4
        ? this.distributeScale(colWidthsDrag, startWidth, this.cellMinWidth)
        : colWidthsDrag
    const domH = Math.round(this.table.getBoundingClientRect().height)
    const sumRowH = rowHeightsDrag.reduce((a, b) => a + b, 0)
    const startHeight = Math.max(MIN_TABLE_HEIGHT, domH || sumRowH)
    this._dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth,
      startHeight,
      colWidths: normalizedColWidths,
      rowHeights: rowHeightsDrag,
      moved: false,
      scrollContainer: (this.dom.closest('.tiptap-content-wrapper') as HTMLElement | null) || null,
      scrollTop: (this.dom.closest('.tiptap-content-wrapper') as HTMLElement | null)?.scrollTop || 0,
      scrollLeft: (this.dom.closest('.tiptap-content-wrapper') as HTMLElement | null)?.scrollLeft || 0,
      lastWidth: startWidth,
      lastHeight: startHeight,
      lastDeltaX: 0,
      lastDeltaY: 0
    }
    this.lockScrollContainer(this._dragState.scrollContainer)
    this.dom.classList.add('is-table-scaling')
    document.addEventListener('mousemove', this._onMouseMove)
    document.addEventListener('mouseup', this._onMouseUp)
  }

  private handleDragMove(event: MouseEvent) {
    if (!this._dragState) return
    event.preventDefault()
    const deltaX = event.clientX - this._dragState.startX
    const deltaY = event.clientY - this._dragState.startY
    if (!this._dragState.moved && Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return
    this._dragState.moved = true
    const boundary = this.getBoundaryBox()
    const isProportional = event.shiftKey

    const unclampedWidth = Math.max(MIN_TABLE_WIDTH, Math.round(this._dragState.startWidth + deltaX))
    const targetWidth = boundary ? Math.min(unclampedWidth, boundary.maxWidth) : unclampedWidth

    let targetHeight: number
    if (isProportional) {
      const widthScale = targetWidth / Math.max(1, this._dragState.startWidth)
      targetHeight = Math.max(MIN_TABLE_HEIGHT, Math.round(this._dragState.startHeight * widthScale))
    } else {
      targetHeight = Math.max(MIN_TABLE_HEIGHT, Math.round(this._dragState.startHeight + deltaY))
    }

    const nextWidths = this.distributeScale(this._dragState.colWidths, targetWidth, this.cellMinWidth)
    const nextHeights = this.distributeScale(this._dragState.rowHeights, targetHeight, MIN_ROW_HEIGHT)
    this.applyWidths(nextWidths)
    this.table.style.height = `${Math.round(targetHeight)}px`
    this.table.style.minHeight = `${Math.round(targetHeight)}px`
    this.applyRowHeights(nextHeights)
    this._dragState.lastWidth = targetWidth
    this._dragState.lastHeight = targetHeight
    this._dragState.lastDeltaX = deltaX
    this._dragState.lastDeltaY = deltaY

    if (this._dragState.scrollContainer) {
      this._dragState.scrollContainer.scrollTop = this._dragState.scrollTop
      this._dragState.scrollContainer.scrollLeft = this._dragState.scrollLeft
    }
  }

  private handleDragEnd() {
    if (!this._dragState) return
    const shouldCommit = this._dragState.moved
    this.dom.classList.remove('is-table-scaling')
    this.detachDocumentListeners()
    this.unlockScrollContainer()
    if (shouldCommit) this.commitNodeAttrs()
    this._dragState = null
  }

  private detachDocumentListeners() {
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('mouseup', this._onMouseUp)
  }

  private lockScrollContainer(container: HTMLElement | null) {
    if (!container) return
    this._lockedScrollContainer = container
    this._lockedOverflowX = container.style.overflowX
    this._lockedOverflowY = container.style.overflowY
    container.style.overflowX = 'hidden'
    container.style.overflowY = 'hidden'
  }

  private unlockScrollContainer() {
    if (!this._lockedScrollContainer) return
    this._lockedScrollContainer.style.overflowX = this._lockedOverflowX
    this._lockedScrollContainer.style.overflowY = this._lockedOverflowY
    this._lockedScrollContainer = null
  }

  private getColgroupSum(): number {
    const cols = Array.from(this.colgroup.children) as HTMLElement[]
    if (!cols.length) return 0
    let sum = 0
    let hasExplicitWidth = false
    for (const col of cols) {
      const w =
        parseInt(col.style.width, 10) ||
        parseInt(col.style.minWidth, 10) ||
        parseInt(col.getAttribute('width') || '0', 10) ||
        0
      if (w > 0) hasExplicitWidth = true
      sum += Math.max(this.cellMinWidth, w)
    }
    return hasExplicitWidth ? sum : 0
  }

  private resolveBodyWidthFromDom(): number | undefined {
    try {
      const el =
        (this.dom.closest('.page-content') as HTMLElement) ||
        (this.dom.closest('.tiptap-content') as HTMLElement)
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

  private applyNodeAttrs(node: ProseMirrorNode) {
    const colgroupSum = this.getColgroupSum()
    const tableWidth = colgroupSum > 0
      ? colgroupSum
      : Number(node.attrs?.tableWidth || 0)

    if (tableWidth > 0) {
      this.applyTableWidth(tableWidth)
    }

    this.table.style.tableLayout = 'fixed'

    const bodyWidth = this.resolveBodyWidthFromDom()
    if (bodyWidth) {
      this.table.style.maxWidth = `${bodyWidth}px`
      this.clampColWidthsToBody(bodyWidth)
    }

    this.applyRowHeightsFromNode(node)

  }

  private clampColWidthsToBody(bodyWidth: number) {
    const cols = Array.from(this.colgroup.children) as HTMLElement[]
    if (!cols.length) return

    let sum = 0
    const widths: number[] = []
    for (const col of cols) {
      const w = parseInt(col.style.width, 10) || parseInt(col.style.minWidth, 10) || this.cellMinWidth
      const clamped = Math.max(this.cellMinWidth, w)
      widths.push(clamped)
      sum += clamped
    }

    if (sum <= bodyWidth) return

    const scale = bodyWidth / sum
    const scaled = widths.map(w => Math.max(this.cellMinWidth, Math.round(w * scale)))
    let scaledSum = scaled.reduce((a, b) => a + b, 0)
    let excess = scaledSum - bodyWidth
    if (excess > 0) {
      for (let i = scaled.length - 1; i >= 0 && excess > 0; i--) {
        const room = scaled[i] - this.cellMinWidth
        if (room > 0) {
          const cut = Math.min(room, excess)
          scaled[i] -= cut
          excess -= cut
        }
      }
      scaledSum = scaled.reduce((a, b) => a + b, 0)
    } else if (excess < 0) {
      scaled[scaled.length - 1] -= excess
      scaledSum = scaled.reduce((a, b) => a + b, 0)
    }


    cols.forEach((col, i) => {
      col.style.width = `${scaled[i]}px`
      col.style.minWidth = `${scaled[i]}px`
    })
    this.table.style.width = `${scaledSum}px`
    this.table.style.minWidth = ''
  }

  private applyRowHeightsFromNode(node: ProseMirrorNode) {
    const rows = this.getRows()
    if (!rows.length) return
    let rowIdx = 0
    node.forEach((child) => {
      if (child.type.name !== 'tableRow' || rowIdx >= rows.length) return
      const h = Number(child.attrs?.height || 0)
      if (h > 0) {
        const row = rows[rowIdx]
        row.style.height = `${Math.round(h)}px`
      }
      rowIdx++
    })
  }

  private resolveTablePos(): number | null {
    if (!this._view) return null
    try {
      const pos = this._view.posAtDOM(this.table, 0)
      const $pos = this._view.state.doc.resolve(pos)
      for (let depth = $pos.depth; depth >= 0; depth--) {
        if ($pos.node(depth).type.name === 'table') {
          return $pos.before(depth)
        }
      }
    } catch {
      return null
    }
    return null
  }

  private commitNodeAttrs() {
    if (!this._view || !this._dragState) return
    const tablePos = this.resolveTablePos()
    if (tablePos === null) return
    const tableNode = this._view.state.doc.nodeAt(tablePos)
    if (!tableNode || tableNode.type.name !== 'table') return

    const colWidths = this.distributeScale(this._dragState.colWidths, this._dragState.lastWidth, this.cellMinWidth)
    const rowHeights = this.distributeScale(this._dragState.rowHeights, this._dragState.lastHeight, MIN_ROW_HEIGHT)
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)
    this.applyTableWidth(tableWidth)

    let transaction = this._view.state.tr.setNodeMarkup(tablePos, undefined, {
      ...tableNode.attrs,
      tableWidth: Math.round(tableWidth)
    })

    const colCount = colWidths.length
    const occupiedUntil = new Array(colCount).fill(0)

    tableNode.forEach((rowNode, rowOffset, rowIndex) => {
      if (rowNode.type.name !== 'tableRow') return
      const rowPos = tablePos + 1 + rowOffset
      transaction = transaction.setNodeMarkup(rowPos, undefined, {
        ...rowNode.attrs,
        height: Math.max(MIN_ROW_HEIGHT, Math.round(rowHeights[rowIndex] || MIN_ROW_HEIGHT))
      })

      let colIdx = 0
      rowNode.forEach((cellNode: any, cellOffset: number) => {
        while (colIdx < colCount && occupiedUntil[colIdx] > rowIndex) colIdx++
        const colspan = cellNode.attrs.colspan || 1
        const rowspan = cellNode.attrs.rowspan || 1
        const cellColWidths = colWidths.slice(colIdx, colIdx + colspan)
        while (cellColWidths.length < colspan) cellColWidths.push(this.cellMinWidth)
        const cellPos = tablePos + 1 + rowOffset + 1 + cellOffset
        transaction = transaction.setNodeMarkup(cellPos, undefined, {
          ...cellNode.attrs,
          colwidth: cellColWidths.map((w) => Math.round(w))
        })
        for (let c = colIdx; c < colIdx + colspan && c < colCount; c++) {
          occupiedUntil[c] = rowIndex + rowspan
        }
        colIdx += colspan
      })
    })

    this._view.dispatch(transaction)
  }
}
