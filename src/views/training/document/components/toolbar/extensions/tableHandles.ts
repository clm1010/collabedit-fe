import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/core'

const pluginKey = new PluginKey('tableHandles')

interface HandleState {
  wrapper: HTMLDivElement
  colBar: HTMLDivElement
  rowBar: HTMLDivElement
  addColBtns: HTMLDivElement
  addRowBtns: HTMLDivElement
  activeTable: HTMLTableElement | null
  visible: boolean
}

function resolveTablePos(view: EditorView, table: HTMLTableElement): number | null {
  try {
    const pos = view.posAtDOM(table, 0)
    const $pos = view.state.doc.resolve(pos)
    for (let d = $pos.depth; d >= 0; d--) {
      if ($pos.node(d).type.name === 'table') return $pos.before(d)
    }
  } catch {
    /* noop */
  }
  return null
}

function getTableRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr'))
}

function getColPositions(table: HTMLTableElement): number[] {
  const colgroup = table.querySelector('colgroup')
  if (!colgroup) return []
  const cols = Array.from(colgroup.children) as HTMLElement[]
  const positions: number[] = [0]
  let x = 0
  for (const col of cols) {
    const w = parseFloat(col.style.width) || parseFloat(col.style.minWidth) || 60
    x += w
    positions.push(x)
  }
  return positions
}

function selectColumn(view: EditorView, tablePos: number, col: number) {
  const tableNode = view.state.doc.nodeAt(tablePos)
  if (!tableNode) return
  const map = TableMap.get(tableNode)
  if (col < 0 || col >= map.width) return
  const topCell = map.map[col]
  const bottomCell = map.map[(map.height - 1) * map.width + col]
  const $anchor = view.state.doc.resolve(tablePos + topCell + 1)
  const $head = view.state.doc.resolve(tablePos + bottomCell + 1)
  view.dispatch(view.state.tr.setSelection(new CellSelection($anchor, $head) as any))
}

function selectRow(view: EditorView, tablePos: number, row: number) {
  const tableNode = view.state.doc.nodeAt(tablePos)
  if (!tableNode) return
  const map = TableMap.get(tableNode)
  if (row < 0 || row >= map.height) return
  const leftCell = map.map[row * map.width]
  const rightCell = map.map[row * map.width + map.width - 1]
  const $anchor = view.state.doc.resolve(tablePos + leftCell + 1)
  const $head = view.state.doc.resolve(tablePos + rightCell + 1)
  view.dispatch(view.state.tr.setSelection(new CellSelection($anchor, $head) as any))
}

function focusCellInColumn(view: EditorView, tablePos: number, col: number) {
  const tableNode = view.state.doc.nodeAt(tablePos)
  if (!tableNode) return
  const map = TableMap.get(tableNode)
  const clampedCol = Math.max(0, Math.min(col, map.width - 1))
  const cellOffset = map.map[clampedCol]
  const $cell = view.state.doc.resolve(tablePos + cellOffset + 1)
  view.dispatch(view.state.tr.setSelection(new CellSelection($cell) as any))
}

function focusCellInRow(view: EditorView, tablePos: number, row: number) {
  const tableNode = view.state.doc.nodeAt(tablePos)
  if (!tableNode) return
  const map = TableMap.get(tableNode)
  const clampedRow = Math.max(0, Math.min(row, map.height - 1))
  const cellOffset = map.map[clampedRow * map.width]
  const $cell = view.state.doc.resolve(tablePos + cellOffset + 1)
  view.dispatch(view.state.tr.setSelection(new CellSelection($cell) as any))
}

function createHandleState(): HandleState {
  const wrapper = document.createElement('div')
  wrapper.className = 'table-handles-overlay'
  wrapper.style.cssText = 'position:absolute;pointer-events:none;z-index:5;display:none;'

  const colBar = document.createElement('div')
  colBar.className = 'table-col-handles'
  colBar.style.cssText =
    'position:absolute;top:-22px;left:0;height:20px;display:flex;pointer-events:auto;'

  const rowBar = document.createElement('div')
  rowBar.className = 'table-row-handles'
  rowBar.style.cssText =
    'position:absolute;left:-22px;top:0;width:20px;display:flex;flex-direction:column;pointer-events:auto;'

  const addColBtns = document.createElement('div')
  addColBtns.className = 'table-add-col-btns'
  addColBtns.style.cssText =
    'position:absolute;top:-28px;left:0;height:8px;pointer-events:auto;'

  const addRowBtns = document.createElement('div')
  addRowBtns.className = 'table-add-row-btns'
  addRowBtns.style.cssText =
    'position:absolute;left:-28px;top:0;width:8px;pointer-events:auto;'

  wrapper.appendChild(colBar)
  wrapper.appendChild(rowBar)
  wrapper.appendChild(addColBtns)
  wrapper.appendChild(addRowBtns)

  return {
    wrapper,
    colBar,
    rowBar,
    addColBtns,
    addRowBtns,
    activeTable: null,
    visible: false
  }
}

function createGripIndicator(isVertical: boolean): HTMLSpanElement {
  const span = document.createElement('span')
  span.style.cssText = isVertical
    ? 'width:4px;height:12px;border-radius:2px;background:#bbb;display:block;transition:background 0.15s;'
    : 'width:12px;height:4px;border-radius:2px;background:#bbb;display:block;transition:background 0.15s;'
  return span
}

function createAddButton(title: string): HTMLDivElement {
  const btn = document.createElement('div')
  btn.style.cssText =
    'width:16px;height:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:1px solid #ddd;font-size:12px;font-weight:600;line-height:1;color:#999;opacity:0;transition:opacity 0.15s,background 0.15s,color 0.15s,border-color 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.08);'
  btn.textContent = '+'
  btn.title = title
  btn.addEventListener('mouseenter', () => {
    btn.style.opacity = '1'
    btn.style.background = '#2383e2'
    btn.style.color = '#fff'
    btn.style.borderColor = '#2383e2'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.opacity = '0'
    btn.style.background = '#fff'
    btn.style.color = '#999'
    btn.style.borderColor = '#ddd'
  })
  return btn
}

function renderColHandles(
  state: HandleState,
  view: EditorView,
  editor: Editor,
  table: HTMLTableElement,
  tablePos: number
) {
  const colPositions = getColPositions(table)
  if (colPositions.length < 2) return

  state.colBar.innerHTML = ''
  state.addColBtns.innerHTML = ''
  const colCount = colPositions.length - 1

  for (let c = 0; c < colCount; c++) {
    const col = c
    const left = colPositions[c]
    const width = colPositions[c + 1] - left

    const grip = document.createElement('div')
    grip.className = 'table-col-grip'
    grip.style.cssText = `position:absolute;left:${left}px;width:${width}px;height:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;`
    const indicator = createGripIndicator(false)
    grip.appendChild(indicator)

    grip.addEventListener('mouseenter', () => { indicator.style.background = '#2383e2' })
    grip.addEventListener('mouseleave', () => { indicator.style.background = '#bbb' })
    grip.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      selectColumn(view, tablePos, col)
    })

    state.colBar.appendChild(grip)
  }

  for (let c = 0; c <= colCount; c++) {
    const colIdx = c
    const x = colPositions[c]
    const btn = createAddButton(
      colIdx === colCount ? '在最后插入列' : `在第 ${colIdx + 1} 列前插入`
    )
    btn.style.position = 'absolute'
    btn.style.left = `${x - 8}px`
    btn.style.top = '0'

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (colIdx >= colCount) {
        focusCellInColumn(view, tablePos, colCount - 1)
        editor.chain().addColumnAfter().run()
      } else {
        focusCellInColumn(view, tablePos, colIdx)
        editor.chain().addColumnBefore().run()
      }
      hideHandles(state)
    })

    state.addColBtns.appendChild(btn)
  }
}

function renderRowHandles(
  state: HandleState,
  view: EditorView,
  editor: Editor,
  table: HTMLTableElement,
  tablePos: number
) {
  const rows = getTableRows(table)
  if (!rows.length) return

  state.rowBar.innerHTML = ''
  state.addRowBtns.innerHTML = ''
  const tableRect = table.getBoundingClientRect()

  for (let r = 0; r < rows.length; r++) {
    const row = r
    const rowRect = rows[r].getBoundingClientRect()
    const top = rowRect.top - tableRect.top
    const height = rowRect.height

    const grip = document.createElement('div')
    grip.className = 'table-row-grip'
    grip.style.cssText = `position:absolute;top:${top}px;height:${height}px;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;`
    const indicator = createGripIndicator(true)
    grip.appendChild(indicator)

    grip.addEventListener('mouseenter', () => { indicator.style.background = '#2383e2' })
    grip.addEventListener('mouseleave', () => { indicator.style.background = '#bbb' })
    grip.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      selectRow(view, tablePos, row)
    })

    state.rowBar.appendChild(grip)
  }

  for (let r = 0; r <= rows.length; r++) {
    const rowIdx = r
    let y: number
    if (r < rows.length) {
      y = rows[r].getBoundingClientRect().top - tableRect.top
    } else {
      const last = rows[rows.length - 1]
      y = last.getBoundingClientRect().bottom - tableRect.top
    }

    const btn = createAddButton(
      rowIdx === rows.length ? '在最后插入行' : `在第 ${rowIdx + 1} 行前插入`
    )
    btn.style.position = 'absolute'
    btn.style.top = `${y - 8}px`
    btn.style.left = '0'

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (rowIdx >= rows.length) {
        focusCellInRow(view, tablePos, rows.length - 1)
        editor.chain().addRowAfter().run()
      } else {
        focusCellInRow(view, tablePos, rowIdx)
        editor.chain().addRowBefore().run()
      }
      hideHandles(state)
    })

    state.addRowBtns.appendChild(btn)
  }
}

function positionOverlay(state: HandleState, table: HTMLTableElement) {
  const parent = table.closest('.custom-table-view') as HTMLElement | null
  if (!parent) return

  if (!state.wrapper.parentElement || state.wrapper.parentElement !== parent) {
    parent.appendChild(state.wrapper)
  }

  state.wrapper.style.top = '0'
  state.wrapper.style.left = '0'
  state.wrapper.style.width = `${table.offsetWidth}px`
  state.wrapper.style.height = `${table.offsetHeight}px`
}

function showHandles(
  state: HandleState,
  view: EditorView,
  editor: Editor,
  table: HTMLTableElement,
  tablePos: number
) {
  state.activeTable = table
  state.visible = true
  state.wrapper.style.display = 'block'
  positionOverlay(state, table)
  renderColHandles(state, view, editor, table, tablePos)
  renderRowHandles(state, view, editor, table, tablePos)
}

function hideHandles(state: HandleState) {
  state.activeTable = null
  state.visible = false
  state.wrapper.style.display = 'none'
  state.colBar.innerHTML = ''
  state.rowBar.innerHTML = ''
  state.addColBtns.innerHTML = ''
  state.addRowBtns.innerHTML = ''
}

export function tableHandlesPlugin(editor: Editor) {
  let state: HandleState | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let lastTableEl: HTMLTableElement | null = null

  return new Plugin({
    key: pluginKey,

    view(editorView: EditorView) {
      state = createHandleState()

      const clearHideTimer = () => {
        if (hideTimer) {
          clearTimeout(hideTimer)
          hideTimer = null
        }
      }

      const scheduleHide = (delay = 200) => {
        clearHideTimer()
        hideTimer = setTimeout(() => {
          if (state) hideHandles(state)
          hideTimer = null
          lastTableEl = null
        }, delay)
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!state) return
        const editable =
          editorView.dom.getAttribute('contenteditable') === 'true'
        if (!editable) {
          if (state.visible) hideHandles(state)
          return
        }

        const target = e.target as HTMLElement
        if (target.closest('.table-handles-overlay')) {
          clearHideTimer()
          return
        }

        const table = target.closest('table') as HTMLTableElement | null
        if (!table || !editorView.dom.contains(table)) {
          if (state.visible) scheduleHide()
          return
        }

        clearHideTimer()

        if (table === lastTableEl && state.visible) return

        lastTableEl = table
        const tablePos = resolveTablePos(editorView, table)
        if (tablePos === null) return

        showHandles(state, editorView, editor, table, tablePos)
      }

      const onMouseLeave = () => {
        if (state?.visible) scheduleHide(300)
      }

      editorView.dom.addEventListener('mousemove', onMouseMove)
      editorView.dom.addEventListener('mouseleave', onMouseLeave)

      state.wrapper.addEventListener('mouseleave', () => {
        if (state?.visible) scheduleHide(300)
      })
      state.wrapper.addEventListener('mouseenter', clearHideTimer)

      return {
        update() {
          if (state?.visible && state.activeTable) {
            positionOverlay(state, state.activeTable)
          }
        },
        destroy() {
          editorView.dom.removeEventListener('mousemove', onMouseMove)
          editorView.dom.removeEventListener('mouseleave', onMouseLeave)
          clearHideTimer()
          if (state) {
            state.wrapper.remove()
            state = null
          }
          lastTableEl = null
        }
      }
    }
  })
}
