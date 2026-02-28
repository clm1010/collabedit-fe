import { Node, mergeAttributes } from '@tiptap/core'

export interface ColoredHorizontalRuleOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coloredHorizontalRule: {
      setHorizontalRule: (options?: { color?: string }) => ReturnType
    }
  }
}

// 用于红头文件的红色横线
export const ColoredHorizontalRule = Node.create<ColoredHorizontalRuleOptions>({
  name: 'horizontalRule',

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  group: 'block',

  parseHTML() {
    return [{ tag: 'hr' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addAttributes() {
    return {
      'data-line-color': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-line-color'),
        renderHTML: (attributes) => {
          if (!attributes['data-line-color']) {
            return {}
          }
          return {
            'data-line-color': attributes['data-line-color'],
            class: attributes['data-line-color'] === 'red' ? 'red-line' : ''
          }
        }
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {}
          }
          return { class: attributes.class }
        }
      }
    }
  },

  addCommands() {
    return {
      setHorizontalRule:
        (options) =>
        ({ chain }) => {
          const attrs: Record<string, any> = {}
          if (options?.color) {
            attrs['data-line-color'] = options.color
            attrs.class = options.color === 'red' ? 'red-line' : ''
          }
          return chain()
            .insertContent({
              type: this.name,
              attrs
            })
            .run()
        }
    }
  }
})
