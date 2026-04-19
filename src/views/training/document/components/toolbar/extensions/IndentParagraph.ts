import Paragraph from '@tiptap/extension-paragraph'

/**
 * 扩展 Tiptap 默认 Paragraph，支持以下属性：
 *   - textIndent：段落首行缩进（CSS text-indent），用于中文 "首行缩进 2 字符"
 *   - indent：段落左侧整体缩进（CSS margin-left）
 *   - indentRight：段落右侧缩进（CSS margin-right）
 *
 * 值由 converter 依据 w:ind 的 firstLine / firstLineChars / left / leftChars
 * 等属性换算成 CSS 可识别的字符串（例如 "2em" / "24px"），渲染时以内联
 * style 形式输出。协同链路透明传递，因为属性存在 ProseMirror 节点上。
 */
const normalize = (val: unknown): string | null => {
  if (val == null) return null
  const str = String(val).trim()
  return str.length > 0 ? str : null
}

export const IndentParagraph = Paragraph.extend({
  addAttributes() {
    const parentAttrs = this.parent?.() ?? {}
    return {
      ...parentAttrs,
      textIndent: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement
          return normalize(el.style.textIndent)
        },
        renderHTML: (attributes) => {
          const v = normalize(attributes.textIndent)
          if (!v) return {}
          return { style: `text-indent: ${v}` }
        },
      },
      indent: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement
          return normalize(el.style.marginLeft)
        },
        renderHTML: (attributes) => {
          const v = normalize(attributes.indent)
          if (!v) return {}
          return { style: `margin-left: ${v}` }
        },
      },
      indentRight: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement
          return normalize(el.style.marginRight)
        },
        renderHTML: (attributes) => {
          const v = normalize(attributes.indentRight)
          if (!v) return {}
          return { style: `margin-right: ${v}` }
        },
      },
    }
  },
})
