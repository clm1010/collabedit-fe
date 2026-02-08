/**
 * 可调整大小的图片扩展
 * 参考 Umo Editor 实现可拖拽调整大小的图片功能
 */
import { Image } from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
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
      }) => ReturnType
    }
  }
}

export const ResizableImage = Image.extend<ResizableImageOptions>({
  name: 'image',

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
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
          return element.getAttribute('data-align') || element.style.textAlign || 'center'
        },
        renderHTML: (attributes) => {
          return {
            'data-align': attributes.align
          }
        }
      },
      draggable: {
        default: true
      },
      // 保留原始 data URL，用于 blob URL 失效时恢复 + 保存时还原图片数据
      'data-origin-src': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-origin-src'),
        renderHTML: (attributes) => {
          if (!attributes['data-origin-src']) return {}
          return { 'data-origin-src': attributes['data-origin-src'] }
        }
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageComponent)
  }
})

export default ResizableImage
