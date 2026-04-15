/**
 * 可调整大小的图片扩展
 * 参考 Umo Editor 实现可拖拽调整大小的图片功能
 */
import { Image } from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Plugin } from '@tiptap/pm/state'
import ResizableImageComponent from './ResizableImageComponent.vue'

export interface ResizableImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      /**
       * 设置图片
       */
      setImage: (options: {
        src: string
        alt?: string
        title?: string
        width?: string | number
        height?: string | number
        display?: 'block' | 'inline'
      }) => ReturnType
    }
  }
}

export const ResizableImage = Image.extend<ResizableImageOptions>({
  name: 'image',

  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      ...this.parent?.(),
      inline: true,
      allowBase64: true,
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null
      },
      alt: {
        default: null
      },
      title: {
        default: null
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width
          if (!width || width === 'auto') return null
          if (typeof width === 'string' && width.endsWith('%')) return null
          return width.replace('px', '')
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width
          }
        }
      },
      height: {
        default: null,
        parseHTML: (element) => {
          // 默认忽略 height，让图片按 width + 自然宽高比显示
          // 仅当用户手动调整过大小时才保留 height（通过 renderHTML 写入）
          const width = element.getAttribute('width') || element.style.width
          const height = element.getAttribute('height') || element.style.height
          if (!height || height === 'auto') return null
          if (typeof height === 'string' && height.endsWith('%')) return null
          // 如果同时有 width 和 height，检查比例是否合理（避免变形）
          if (width) {
            const w = parseFloat(String(width))
            const h = parseFloat(String(height))
            if (w > 0 && h > 0 && (h / w > 5 || w / h > 5)) {
              // 极端比例（>5:1），忽略 height
              return null
            }
          }
          return height.replace('px', '')
        },
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {}
          }
          return {
            height: attributes.height
          }
        }
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          return element.getAttribute('data-align')
            || element.style.textAlign
            || element.parentElement?.style?.textAlign
            || 'center'
        },
        renderHTML: (attributes) => {
          const align = attributes.align || 'center'
          if (attributes.display === 'inline') {
            return { 'data-align': align }
          }
          let style = 'display: block;'
          if (align === 'center') style += ' margin-left: auto; margin-right: auto;'
          else if (align === 'right') style += ' margin-left: auto; margin-right: 0;'
          else style += ' margin-right: auto; margin-left: 0;'
          return { 'data-align': align, style }
        }
      },
      display: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-display') || 'block',
        renderHTML: (attributes) => {
          const display = attributes.display || 'block'
          if (display === 'inline') {
            return { 'data-display': 'inline', style: 'display: inline-block; vertical-align: bottom;' }
          }
          return { 'data-display': display }
        }
      },
      // 保留原始 data URL，用于 blob URL 失效时恢复 + 保存时还原图片数据
      'data-origin-src': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-origin-src'),
        renderHTML: (attributes) => {
          if (!attributes['data-origin-src']) return {}
          return { 'data-origin-src': attributes['data-origin-src'] }
        }
      },
      cropTop: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('data-crop-top')
          return v ? parseFloat(v) : null
        },
        renderHTML: (attributes) => {
          if (attributes.cropTop == null) return {}
          return { 'data-crop-top': String(attributes.cropTop) }
        }
      },
      cropRight: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('data-crop-right')
          return v ? parseFloat(v) : null
        },
        renderHTML: (attributes) => {
          if (attributes.cropRight == null) return {}
          return { 'data-crop-right': String(attributes.cropRight) }
        }
      },
      cropBottom: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('data-crop-bottom')
          return v ? parseFloat(v) : null
        },
        renderHTML: (attributes) => {
          if (attributes.cropBottom == null) return {}
          return { 'data-crop-bottom': String(attributes.cropBottom) }
        }
      },
      cropLeft: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('data-crop-left')
          return v ? parseFloat(v) : null
        },
        renderHTML: (attributes) => {
          if (attributes.cropLeft == null) return {}
          return { 'data-crop-left': String(attributes.cropLeft) }
        }
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageComponent)
  },

  addProseMirrorPlugins() {
    const SPLIT_META = 'blockImageAutoSplit'
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((t) => t.docChanged)) return null
          if (transactions.some((t) => t.getMeta(SPLIT_META))) return null

          const { tr } = newState
          let modified = false
          const replacements: { from: number; to: number; content: any[] }[] = []

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'paragraph') return

            let hasBlockImage = false
            let hasOtherContent = false
            node.forEach((child) => {
              if (child.type.name === 'image' && child.attrs.display !== 'inline') {
                hasBlockImage = true
              } else {
                hasOtherContent = true
              }
            })
            if (!hasBlockImage || !hasOtherContent) return

            const schema = newState.schema
            const newNodes: any[] = []
            let currentChildren: any[] = []

            const flush = () => {
              if (currentChildren.length > 0) {
                newNodes.push(schema.nodes.paragraph.create(node.attrs, currentChildren))
                currentChildren = []
              }
            }

            node.forEach((child) => {
              if (child.type.name === 'image' && child.attrs.display !== 'inline') {
                flush()
                newNodes.push(schema.nodes.paragraph.create(null, child))
              } else {
                currentChildren.push(child)
              }
            })
            flush()

            if (newNodes.length > 1) {
              replacements.push({ from: pos, to: pos + node.nodeSize, content: newNodes })
            }
          })

          replacements.sort((a, b) => b.from - a.from)
          for (const { from, to, content } of replacements) {
            const mFrom = tr.mapping.map(from)
            const mTo = tr.mapping.map(to)
            tr.replaceWith(mFrom, mTo, content)
            modified = true
          }

          if (modified) {
            tr.setMeta(SPLIT_META, true)
          }
          return modified ? tr : null
        }
      })
    ]
  }
})

export default ResizableImage
