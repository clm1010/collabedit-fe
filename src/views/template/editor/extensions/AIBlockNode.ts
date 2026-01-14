import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AIBlockComponent from '../components/AIBlockComponent.vue'

export interface AIBlockNodeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlockNode: {
      /**
       * 插入 AI 模块块
       */
      insertAIBlock: (content?: string) => ReturnType
      /**
       * 将选中内容转换为 AI 模块
       */
      setAIBlock: () => ReturnType
      /**
       * 移除 AI 模块（保留内容）
       */
      unsetAIBlock: () => ReturnType
      /**
       * 切换 AI 模块
       */
      toggleAIBlock: () => ReturnType
    }
  }
}

/**
 * AI 模块块级扩展
 * 使用金色边框来标识 AI 生成区域
 * 支持内部编辑多行内容
 */
export const AIBlockNode = Node.create<AIBlockNodeOptions>({
  name: 'aiBlockNode',

  // 块级节点
  group: 'block',

  // 允许块级内容（段落、列表等）
  content: 'block+',

  // 定义为原子节点，整体选择
  atom: false,

  // 是否可以拖动
  draggable: true,

  // 选择整个节点
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  // 添加属性
  addAttributes() {
    return {
      // AI 模块的唯一标识
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-ai-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { 'data-ai-id': attributes.id }
        }
      },
      // 模块类型（可选）
      type: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-ai-type') || 'default',
        renderHTML: (attributes) => {
          return { 'data-ai-type': attributes.type }
        }
      },
      // 标题
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

  // 使用 Vue 组件渲染
  addNodeView() {
    return VueNodeViewRenderer(AIBlockComponent)
  },

  addCommands() {
    return {
      insertAIBlock:
        (content?: string) =>
        ({ commands }) => {
          // 生成唯一 ID
          const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // 如果有内容，创建带内容的节点
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

          // 否则创建空的 AI 模块
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

          // 检查是否有选中的内容
          const hasSelection = from !== to

          if (hasSelection) {
            // 获取选中范围所在的块级节点范围
            const startBlock = $from.blockRange($to)

            if (startBlock) {
              // 扩展选择范围到完整的块级节点
              const blockStart = startBlock.start
              const blockEnd = startBlock.end

              // 收集选中范围内的所有块级节点内容
              const content: any[] = []
              state.doc.nodesBetween(blockStart, blockEnd, (node, pos) => {
                // 只收集顶层块级节点
                if (node.isBlock && pos >= blockStart && pos < blockEnd) {
                  const depth = state.doc.resolve(pos).depth
                  if (depth === startBlock.depth) {
                    content.push(node.toJSON())
                  }
                }
              })

              // 如果没有收集到块级内容，使用选中的文本创建段落
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

              // 删除原来的内容并插入 AI 模块
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

          // 没有选中内容的情况
          const parentNode = $from.parent

          // 如果当前段落为空或只有空白，直接替换为 AI 模块
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

          // 如果当前段落有内容，将整个段落包裹到 AI 模块中
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

          // 向上查找包含当前位置的 AI 模块
          let aiBlockPos: number | null = null
          let aiBlockNode: any = null

          // 从当前位置向上查找祖先节点
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === this.name) {
              aiBlockPos = $from.before(depth)
              aiBlockNode = node
              break
            }
          }

          // 如果没找到，尝试在文档中搜索
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

          // 提取 AI 模块内的内容
          const content: any[] = []
          aiBlockNode.content.forEach((child: any) => {
            content.push(child.toJSON())
          })

          // 删除 AI 模块并插入其内容
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

          // 检查当前是否在 AI 模块内（向上查找祖先节点）
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

  // 添加键盘快捷键
  addKeyboardShortcuts() {
    return {
      // Mod 是跨平台的修饰键（Mac 上是 Cmd，其他平台是 Ctrl）
      'Mod-Shift-a': () => this.editor.commands.toggleAIBlock()
    }
  }
})
