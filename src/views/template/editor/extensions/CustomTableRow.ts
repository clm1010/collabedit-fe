import { TableRow } from '@tiptap/extension-table'

/**
 * 自定义 TableRow 扩展 - 支持内联样式
 */
export const CustomTableRow = TableRow.extend({
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
  }
})
