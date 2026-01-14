import { Table } from '@tiptap/extension-table'
import { mergeAttributes } from '@tiptap/core'

/**
 * 自定义 Table 扩展 - 支持内联样式
 * 用于红头文件中的无边框表格（编号和签发人左右对齐）
 */
export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // 添加 style 属性支持
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {}
          }
          return { style: attributes.style }
        }
      }
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['table', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ['tbody', 0]]
  }
})
