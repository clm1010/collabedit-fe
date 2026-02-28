import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AIBlockComponent from '../components/AIBlockComponent.vue'

export interface AIBlockNodeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlockNode: {
      insertAIBlock: (content?: string) => ReturnType
      setAIBlock: () => ReturnType
      /** 移除 AI 模块（保留内容） */
      unsetAIBlock: () => ReturnType
      toggleAIBlock: () => ReturnType
    }
  }
}

export const AIBlockNode = Node.create<AIBlockNodeOptions>({
  name: 'aiBlockNode',

  group: 'block',
  content: 'block+',
  atom: false,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-ai-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { 'data-ai-id': attributes.id }
        }
      },
      type: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-ai-type') || 'default',
        renderHTML: (attributes) => {
          return { 'data-ai-type': attributes.type }
        }
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-ai-title') || '',
        renderHTML: (attributes) => {
          if (!attributes.title) return {}
          return { 'data-ai-title': attributes.title }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="ai-block-node"]'
      },
      {
        tag: 'div.ai-block-node'
      },
      // 兼容旧的行内标记解析
      {
        tag: 'section[data-type="ai-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'ai-block-node',
        class: 'ai-block-node'
      }),
      0
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(AIBlockComponent)
  },

  addCommands() {
    return {
      insertAIBlock:
        (content?: string) =>
        ({ commands }) => {
          const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          if (content) {
            return commands.insertContent({
              type: this.name,
              attrs: { id },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: content }]
                }
              ]
            })
          }

          return commands.insertContent({
            type: this.name,
            attrs: { id },
            content: [
              {
                type: 'paragraph'
              }
            ]
          })
        },

      setAIBlock:
        () =>
        ({ state, chain }) => {
          const { selection } = state
          const { from, to, $from, $to } = selection
          const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const hasSelection = from !== to

          if (hasSelection) {
            const startBlock = $from.blockRange($to)

            if (startBlock) {
              const blockStart = startBlock.start
              const blockEnd = startBlock.end

              const content: any[] = []
              state.doc.nodesBetween(blockStart, blockEnd, (node, pos) => {
                if (node.isBlock && pos >= blockStart && pos < blockEnd) {
                  const depth = state.doc.resolve(pos).depth
                  if (depth === startBlock.depth) {
                    content.push(node.toJSON())
                  }
                }
              })

              if (content.length === 0) {
                const selectedText = state.doc.textBetween(from, to)
                if (selectedText) {
                  content.push({
                    type: 'paragraph',
                    content: [{ type: 'text', text: selectedText }]
                  })
                } else {
                  content.push({ type: 'paragraph' })
                }
              }

              return chain()
                .command(({ tr }) => {
                  tr.delete(blockStart, blockEnd)
                  return true
                })
                .insertContentAt(blockStart, {
                  type: this.name,
                  attrs: { id },
                  content
                })
                .run()
            }
          }

          const parentNode = $from.parent

          if (parentNode.isTextblock && parentNode.textContent.trim() === '') {
            const paragraphStart = $from.before($from.depth)
            const paragraphEnd = $from.after($from.depth)

            return chain()
              .command(({ tr }) => {
                tr.delete(paragraphStart, paragraphEnd)
                return true
              })
              .insertContentAt(paragraphStart, {
                type: this.name,
                attrs: { id },
                content: [{ type: 'paragraph' }]
              })
              .run()
          }

          const paragraphStart = $from.before($from.depth)
          const paragraphEnd = $from.after($from.depth)
          const paragraphContent = parentNode.toJSON()

          return chain()
            .command(({ tr }) => {
              tr.delete(paragraphStart, paragraphEnd)
              return true
            })
            .insertContentAt(paragraphStart, {
              type: this.name,
              attrs: { id },
              content: [paragraphContent]
            })
            .run()
        },

      unsetAIBlock:
        () =>
        ({ state, chain }) => {
          const { selection } = state
          const { $from } = selection

          let aiBlockPos: number | null = null
          let aiBlockNode: any = null

          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === this.name) {
              aiBlockPos = $from.before(depth)
              aiBlockNode = node
              break
            }
          }

          // 回退：在邻近范围内搜索
          if (aiBlockPos === null) {
            const pos = $from.pos
            state.doc.nodesBetween(
              Math.max(0, pos - 100),
              Math.min(state.doc.content.size, pos + 100),
              (node, nodePos) => {
                if (
                  node.type.name === this.name &&
                  nodePos <= pos &&
                  nodePos + node.nodeSize >= pos
                ) {
                  aiBlockPos = nodePos
                  aiBlockNode = node
                  return false
                }
                return true
              }
            )
          }

          if (aiBlockPos === null || !aiBlockNode) {
            return false
          }

          const content: any[] = []
          aiBlockNode.content.forEach((child: any) => {
            content.push(child.toJSON())
          })

          return chain()
            .command(({ tr }) => {
              tr.delete(aiBlockPos!, aiBlockPos! + aiBlockNode.nodeSize)
              return true
            })
            .insertContentAt(aiBlockPos, content)
            .run()
        },

      toggleAIBlock:
        () =>
        ({ state, commands }) => {
          const { selection } = state
          const { $from } = selection

          let isInAIBlock = false
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === this.name) {
              isInAIBlock = true
              break
            }
          }

          if (isInAIBlock) {
            return commands.unsetAIBlock()
          } else {
            return commands.setAIBlock()
          }
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-a': () => this.editor.commands.toggleAIBlock()
    }
  }
})
