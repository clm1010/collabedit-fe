import { Mark, mergeAttributes } from '@tiptap/core'

export interface AIBlockOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlock: {
      /**
       * 切换 AI 模块标记
       */
      toggleAIBlock: () => ReturnType
      /**
       * 设置 AI 模块标记
       */
      setAIBlock: () => ReturnType
      /**
       * 取消 AI 模块标记
       */
      unsetAIBlock: () => ReturnType
    }
  }
}

/**
 * AI 模块扩展（行内标记）
 * 使用浅蓝色背景来标识 AI 生成区域
 * 用于将选中的文字标识为 AI 模块
 */
export const AIBlock = Mark.create<AIBlockOptions>({
  name: 'aiBlock',

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="ai-block"]'
      },
      {
        tag: 'span.ai-block'
      },
      {
        tag: 'mark[data-type="ai-block"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'ai-block',
        class: 'ai-block'
      }),
      0
    ]
  },

  addCommands() {
    return {
      toggleAIBlock:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },

      setAIBlock:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name)
        },

      unsetAIBlock:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
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
