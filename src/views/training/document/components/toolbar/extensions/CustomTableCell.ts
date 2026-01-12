/**
 * 自定义 TableCell 扩展
 * 添加 textAlign 和 backgroundColor 属性支持
 * 参考: https://tiptap.dev/docs/editor/extensions/nodes/table-cell
 */
import { TableCell } from '@tiptap/extension-table'

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // 文本对齐属性
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign || null,
        renderHTML: (attributes) => {
          if (!attributes.textAlign) {
            return {}
          }
          return {
            style: `text-align: ${attributes.textAlign}`
          }
        }
      },
      // 背景颜色属性
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`
          }
        }
      }
    }
  }
})
