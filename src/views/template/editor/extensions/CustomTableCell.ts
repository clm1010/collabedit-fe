import { TableCell } from '@tiptap/extension-table'

/**
 * 自定义 TableCell 扩展 - 支持内联样式
 */
export const CustomTableCell = TableCell.extend({
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
