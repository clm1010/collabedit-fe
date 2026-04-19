/**
 * TOC 条目扩展（Table of Contents Entry）
 * 由 converter 在导入 docx 时从 SDT 目录生成，渲染为 "标题 ........ 页码" 样式
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TocEntryComponent from './TocEntryComponent.vue'

export interface TocEntryOptions {
  HTMLAttributes: Record<string, any>
}

export interface TocEntryAttrs {
  text: string
  pageNumber: string
  level: number
  href?: string
  rawXml?: string
  /**
   * 选择性保存高保真方案：该条目所属 SDT 的稳定 ID（同一 SDT 的所有 tocEntry 共享）。
   * 导出时连续且共享同一 sdtId 的条目若全部未修改，整个 SDT 字节原样回写。
   */
  __origSdtId?: string | null
  /**
   * 选择性保存高保真方案：仅挂在该 SDT 的"第一个"tocEntry 上，保存完整的
   * w:sdt 原始 XML 字节字符串；其余同 SDT 的条目共享该字节，不重复保存。
   */
  __origSdtXml?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tocEntry: {
      setTocEntry: (attrs: Partial<TocEntryAttrs>) => ReturnType
    }
  }
}

export const TocEntry = Node.create<TocEntryOptions>({
  name: 'tocEntry',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'toc-entry'
      }
    }
  },

  addAttributes() {
    return {
      text: { default: '' },
      pageNumber: { default: '' },
      level: { default: 1 },
      href: { default: null },
      rawXml: { default: null },
      __origSdtId: {
        default: null,
        rendered: false,
        keepOnSplit: false
      },
      __origSdtXml: {
        default: null,
        rendered: false,
        keepOnSplit: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toc-entry"]',
        getAttrs: (el) => {
          const e = el as HTMLElement
          const level = Number(e.getAttribute('data-level') ?? '1')
          return {
            text: e.getAttribute('data-text') ?? e.textContent ?? '',
            pageNumber: e.getAttribute('data-page') ?? '',
            level: Number.isFinite(level) ? level : 1,
            href: e.getAttribute('data-href'),
            rawXml: null
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs as TocEntryAttrs
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'toc-entry',
        'data-text': attrs.text ?? '',
        'data-page': attrs.pageNumber ?? '',
        'data-level': String(attrs.level ?? 1),
        'data-href': attrs.href ?? ''
      }),
      `${attrs.text ?? ''}${attrs.pageNumber ? `  ${attrs.pageNumber}` : ''}`
    ]
  },

  addCommands() {
    return {
      setTocEntry:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          })
        }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TocEntryComponent)
  }
})

export default TocEntry
