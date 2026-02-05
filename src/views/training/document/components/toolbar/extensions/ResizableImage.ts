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
          // 导入的图片忽略高度，让图片按自然比例显示
          if (element.getAttribute('data-imported') === 'true') return null
          const height = element.getAttribute('height') || element.style.height
          if (!height || height === 'auto') return null
          if (typeof height === 'string' && height.endsWith('%')) return null
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
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageComponent)
  }
})

export default ResizableImage
