import { TableRow } from '@tiptap/extension-table'

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const h = el.style.height
          return h ? parseInt(h, 10) || null : null
        },
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.height) return {}
          return { style: `height: ${attrs.height}px` }
        }
      }
    }
  }
})
