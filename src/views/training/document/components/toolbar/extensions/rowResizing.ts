import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const ROW_RESIZE_THRESHOLD = 8
const MIN_ROW_HEIGHT = 30

interface DragState {
  tableEl: HTMLTableElement
  rowIndex: number
  startY: number
  startHeight: number
  trPos: number
}

function resolveRowPos(
  view: EditorView,
  tr: HTMLTableRowElement
): { trDom: HTMLTableRowElement; trPos: number } | null {
  try {
    const pos = view.posAtDOM(tr, 0)
    if (pos < 0) return null
    const $pos = view.state.doc.resolve(pos)
    for (let d = $pos.depth; d >= 0; d--) {
      if ($pos.node(d).type.name === 'tableRow') {
        return { trDom: tr, trPos: $pos.before(d) }
      }
    }
  } catch {
    // posAtDOM can throw if the DOM is out of sync
  }
  return null
}

function findTableRowFromEvent(
  view: EditorView,
  event: MouseEvent
): { trDom: HTMLTableRowElement; trPos: number } | null {
  const target = event.target as HTMLElement
  if (!target) return null

  const td = target.closest('td, th') as HTMLTableCellElement | null
  if (!td) return null

  const tr = td.parentElement as HTMLTableRowElement | null
  if (!tr || tr.tagName !== 'TR') return null

  const rect = tr.getBoundingClientRect()

  if (Math.abs(event.clientY - rect.bottom) <= ROW_RESIZE_THRESHOLD) {
    return resolveRowPos(view, tr)
  }

  if (Math.abs(event.clientY - rect.top) <= ROW_RESIZE_THRESHOLD) {
    const prevTr = tr.previousElementSibling as HTMLTableRowElement | null
    if (prevTr?.tagName === 'TR') {
      return resolveRowPos(view, prevTr)
    }
  }

  return null
}

export const rowResizingPluginKey = new PluginKey('rowResizing')

export function rowResizing(): Plugin {
  let dragState: DragState | null = null
  let handleEl: HTMLElement | null = null

  function showHandle(tr: HTMLTableRowElement) {
    const table = tr.closest('table')
    if (!table) return
    const wrapper = table.parentElement
    if (!wrapper) return

    if (!handleEl) {
      handleEl = document.createElement('div')
      handleEl.className = 'row-resize-handle'
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const trRect = tr.getBoundingClientRect()

    handleEl.style.left = '0'
    handleEl.style.right = '0'
    handleEl.style.top = `${trRect.bottom - wrapperRect.top - 2}px`

    if (handleEl.parentElement !== wrapper) {
      wrapper.style.position = 'relative'
      wrapper.appendChild(handleEl)
    }
  }

  function hideHandle() {
    if (handleEl?.parentElement) {
      handleEl.remove()
    }
  }

  const handleMouseMove = (view: EditorView, event: MouseEvent) => {
    if (dragState) return false

    const target = event.target as HTMLElement
    const td = target?.closest('td, th') as HTMLElement | null
    if (td?.querySelector('.column-resize-handle')) {
      if (view.dom.style.cursor === 'row-resize') view.dom.style.cursor = ''
      hideHandle()
      return false
    }

    const hit = findTableRowFromEvent(view, event)
    if (hit) {
      view.dom.style.cursor = 'row-resize'
      showHandle(hit.trDom)
    } else {
      if (view.dom.style.cursor === 'row-resize') {
        view.dom.style.cursor = ''
      }
      hideHandle()
    }
    return false
  }

  const handleMouseDown = (view: EditorView, event: MouseEvent) => {
    if (event.button !== 0) return false

    const target = event.target as HTMLElement
    const td = target?.closest('td, th') as HTMLElement | null
    if (td?.querySelector('.column-resize-handle')) {
      return false
    }

    const hit = findTableRowFromEvent(view, event)
    if (!hit) return false

    event.preventDefault()
    const startHeight = hit.trDom.offsetHeight
    const tableEl = hit.trDom.closest('table')
    if (!tableEl) return false

    const tbody = tableEl.querySelector('tbody') || tableEl
    const rowIndex = Array.from(tbody.rows || tbody.querySelectorAll('tr')).indexOf(hit.trDom)
    if (rowIndex < 0) return false

    dragState = {
      tableEl,
      rowIndex,
      startY: event.clientY,
      startHeight,
      trPos: hit.trPos
    }

    showHandle(hit.trDom)

    const onMouseMove = (e: MouseEvent) => {
      if (!dragState) return
      const delta = e.clientY - dragState.startY
      const newHeight = Math.max(MIN_ROW_HEIGHT, dragState.startHeight + delta)

      const rows = dragState.tableEl.querySelector('tbody')?.rows || dragState.tableEl.rows
      const currentTr = rows?.[dragState.rowIndex] as HTMLTableRowElement | undefined


      if (currentTr) {
        currentTr.style.height = `${newHeight}px`
        showHandle(currentTr)
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      if (!dragState) return

      const delta = e.clientY - dragState.startY
      const finalHeight = Math.max(MIN_ROW_HEIGHT, dragState.startHeight + delta)

      const { state, dispatch } = view
      const trPos = dragState.trPos

      try {
        const node = state.doc.nodeAt(trPos)
        if (node && node.type.name === 'tableRow') {
          const tr = state.tr.setNodeMarkup(trPos, undefined, {
            ...node.attrs,
            height: finalHeight
          })
          dispatch(tr)
        }
      } catch {
        // pos may be stale if the document changed during drag
      }

      dragState = null
      view.dom.style.cursor = ''
      hideHandle()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return true
  }

  const handleMouseLeave = (view: EditorView) => {
    if (!dragState) {
      if (view.dom.style.cursor === 'row-resize') {
        view.dom.style.cursor = ''
      }
      hideHandle()
    }
    return false
  }

  return new Plugin({
    key: rowResizingPluginKey,
    props: {
      handleDOMEvents: {
        mousemove: handleMouseMove,
        mousedown: handleMouseDown,
        mouseleave: handleMouseLeave
      }
    }
  })
}

export const RowResizing = Extension.create({
  name: 'rowResizing',

  addProseMirrorPlugins() {
    return [rowResizing()]
  }
})
