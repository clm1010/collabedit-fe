import { Table } from '@tiptap/extension-table'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import { CustomTableView } from './CustomTableView'
import { tableHandlesPlugin } from './tableHandles'

const CELL_MIN_WIDTH = 10

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTable: {
      fitTableToWidth: () => ReturnType
    }
  }
}

const parsePx = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

const extractWidthFromStyle = (styleText?: string | null): number | null => {
  if (!styleText) return null
  const widthMatch = styleText.match(/(?:^|;)\s*width\s*:\s*([0-9.]+)px/i)
  if (widthMatch?.[1]) {
    const width = parsePx(widthMatch[1])
    if (width) return width
  }
  const minWidthMatch = styleText.match(/(?:^|;)\s*min-width\s*:\s*([0-9.]+)px/i)
  if (minWidthMatch?.[1]) {
    const width = parsePx(minWidthMatch[1])
    if (width) return width
  }
  return null
}

function resolveBodyWidth(dom: HTMLElement | undefined): number | undefined {
  try {
    if (!dom) return undefined
    const pageContent = dom.closest('.page-content') as HTMLElement | null
    const tiptapContent = dom.closest('.tiptap-content') as HTMLElement | null
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

function fitTableNodeToWidth(
  tr: Transaction,
  tablePos: number,
  tableNode: any,
  bodyWidth: number
): Transaction {
  const firstRow = tableNode.firstChild
  if (!firstRow) return tr
  let colCount = 0
  firstRow.forEach((cell: any) => { colCount += cell.attrs.colspan || 1 })
  if (colCount <= 0) return tr

  const colWidth = Math.max(CELL_MIN_WIDTH, Math.floor(bodyWidth / colCount))
  const drift = bodyWidth - colWidth * colCount
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    i === colCount - 1 ? colWidth + drift : colWidth
  )

  tr = tr.setNodeMarkup(tablePos, undefined, {
    ...tableNode.attrs,
    tableWidth: bodyWidth
  })

  tableNode.forEach((rowNode: any, rowOffset: number) => {
    if (rowNode.type.name !== 'tableRow') return
    let colIdx = 0
    rowNode.forEach((cellNode: any, cellOffset: number) => {
      const cellPos = tablePos + 1 + rowOffset + 1 + cellOffset
      const span = cellNode.attrs.colspan || 1
      const cellWidthArr = colWidths.slice(colIdx, colIdx + span)
      tr = tr.setNodeMarkup(cellPos, undefined, {
        ...cellNode.attrs,
        colwidth: cellWidthArr
      })
      colIdx += span
    })
  })
  return tr
}

function extractLogicalColWidths(tableNode: any): number[] {
  const firstRow = tableNode.firstChild
  if (!firstRow) return []
  const widths: number[] = []
  firstRow.forEach((cell: any) => {
    const cw = cell.attrs.colwidth
    const span = cell.attrs.colspan || 1
    if (cw && Array.isArray(cw) && cw.length === span) {
      for (const w of cw) widths.push(w || 0)
    } else {
      for (let i = 0; i < span; i++) widths.push(0)
    }
  })
  return widths
}

const autoFitPluginKey = new PluginKey('tableAutoFit')
const tableWidthSyncPluginKey = new PluginKey('tableWidthSync')

export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const dataWidth = parsePx(element.getAttribute('data-table-width'))
          if (dataWidth) return dataWidth
          return extractWidthFromStyle(element.getAttribute('style'))
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const width = parsePx(String(attributes.tableWidth ?? ''))
          if (!width) return {}
          return {
            'data-table-width': String(width),
            style: `width: ${width}px;`
          }
        }
      }
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),

      fitTableToWidth:
        () =>
        ({ editor, state, tr, dispatch }) => {
          const bodyWidth = resolveBodyWidth(editor.view.dom as HTMLElement)
          if (!bodyWidth) return false
          const { $from } = state.selection
          let tablePos: number | null = null
          for (let depth = $from.depth; depth >= 0; depth--) {
            if ($from.node(depth).type.name === 'table') {
              tablePos = $from.before(depth)
              break
            }
          }
          if (tablePos === null) return false
          const tableNode = state.doc.nodeAt(tablePos)
          if (!tableNode || tableNode.type.name !== 'table') return false

          if (dispatch) {
            fitTableNodeToWidth(tr, tablePos, tableNode, bodyWidth)
          }
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || []
    return [
      ...parentPlugins,
      tableHandlesPlugin(this.editor),
      new Plugin({
        key: tableWidthSyncPluginKey,
        appendTransaction(transactions: readonly Transaction[], oldState, newState) {
          if (!transactions.some(t => t.docChanged)) return null

          let bodyWidth: number | undefined
          try {
            const domEl = document.querySelector('.ProseMirror') as HTMLElement | null
            bodyWidth = resolveBodyWidth(domEl || undefined)
          } catch { /* */ }
          if (!bodyWidth) return null

          let tr = newState.tr
          let changed = false

          newState.doc.descendants((node: any, pos: number) => {
            if (node.type.name !== 'table') return true

            const newCols = extractLogicalColWidths(node)
            const newSum = newCols.reduce((a, b) => a + b, 0)
            const allValid = newCols.length > 0 && newCols.every(w => w > 0)
            if (!allValid || newSum <= 0) return false

            const currentTableWidth = Number(node.attrs.tableWidth || 0)

            if (newSum <= bodyWidth!) {
              if (Math.abs(newSum - currentTableWidth) > 2) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  tableWidth: Math.round(newSum)
                })
                changed = true
              }
              return false
            }

            const excess = newSum - bodyWidth!
            const cappedCols = [...newCols]

            const oldTableNode = oldState.doc.nodeAt(pos)
            const oldCols =
              oldTableNode && oldTableNode.type.name === 'table'
                ? extractLogicalColWidths(oldTableNode)
                : null

            if (
              oldCols &&
              oldCols.length === cappedCols.length &&
              oldCols.every(w => w > 0)
            ) {
              let remaining = excess
              for (let i = 0; i < cappedCols.length && remaining > 0; i++) {
                if (cappedCols[i] > oldCols[i]) {
                  const increase = cappedCols[i] - oldCols[i]
                  const cap = Math.min(increase, remaining)
                  cappedCols[i] -= cap
                  remaining -= cap
                }
              }
              while (remaining > 0) {
                let maxIdx = 0
                for (let j = 1; j < cappedCols.length; j++) {
                  if (cappedCols[j] > cappedCols[maxIdx]) maxIdx = j
                }
                const room = cappedCols[maxIdx] - CELL_MIN_WIDTH
                if (room <= 0) break
                const cut = Math.min(room, remaining)
                cappedCols[maxIdx] -= cut
                remaining -= cut
              }
            } else {
              const scale = bodyWidth! / newSum
              for (let i = 0; i < cappedCols.length; i++) {
                cappedCols[i] = Math.max(
                  CELL_MIN_WIDTH,
                  Math.round(cappedCols[i] * scale)
                )
              }
              const scaledSum = cappedCols.reduce((a, b) => a + b, 0)
              let driftExcess = scaledSum - bodyWidth!
              for (
                let i = cappedCols.length - 1;
                i >= 0 && driftExcess > 0;
                i--
              ) {
                const room = cappedCols[i] - CELL_MIN_WIDTH
                if (room > 0) {
                  const cut = Math.min(room, driftExcess)
                  cappedCols[i] -= cut
                  driftExcess -= cut
                }
              }
            }

            node.forEach((rowNode: any, rowOffset: number) => {
              if (rowNode.type.name !== 'tableRow') return
              let colIdx = 0
              rowNode.forEach((cellNode: any, cellOffset: number) => {
                const span = cellNode.attrs.colspan || 1
                const cellCw = cappedCols.slice(colIdx, colIdx + span)
                const cellPos = pos + 1 + rowOffset + 1 + cellOffset
                tr = tr.setNodeMarkup(cellPos, undefined, {
                  ...cellNode.attrs,
                  colwidth: cellCw
                })
                colIdx += span
              })
              changed = true
            })

            tr = tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              tableWidth: bodyWidth
            })
            changed = true

            return false
          })

          return changed ? tr : null
        }
      }),
      new Plugin({
        key: autoFitPluginKey,
        appendTransaction(transactions: readonly Transaction[], oldState, newState) {
          if (!transactions.some(tr => tr.docChanged)) return null
          const oldTableCount = countTables(oldState.doc)
          const newTableCount = countTables(newState.doc)
          if (newTableCount <= oldTableCount) return null

          const newTablePositions = findNewTablesWithoutWidth(newState.doc)
          if (!newTablePositions.length) return null

          let bodyWidth: number | undefined
          try {
            const domEl = document.querySelector('.ProseMirror') as HTMLElement | null
            bodyWidth = resolveBodyWidth(domEl || undefined)
          } catch { /* */ }
          if (!bodyWidth) return null

          let tr = newState.tr
          for (const { pos, node } of newTablePositions) {
            tr = fitTableNodeToWidth(tr, pos, node, bodyWidth)
          }
          return tr.docChanged ? tr : null
        }
      })
    ]
  }
}).configure({
  resizable: true,
  allowTableNodeSelection: true,
  View: CustomTableView,
  cellMinWidth: CELL_MIN_WIDTH
})

function countTables(doc: any): number {
  let count = 0
  doc.descendants((node: any) => {
    if (node.type.name === 'table') count++
  })
  return count
}

function findNewTablesWithoutWidth(doc: any): { pos: number; node: any }[] {
  const result: { pos: number; node: any }[] = []
  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'table' && !node.attrs.tableWidth) {
      const firstRow = node.firstChild
      if (!firstRow) return false
      let hasColwidth = false
      firstRow.forEach((cell: any) => {
        if (cell.attrs.colwidth?.length) hasColwidth = true
      })
      if (!hasColwidth) {
        result.push({ pos, node })
      }
      return false
    }
    return true
  })
  return result
}

