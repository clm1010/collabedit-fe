import { Mark, mergeAttributes } from '@tiptap/core'

export interface AIBlockOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlock: {
      toggleAIBlock: () => ReturnType
      setAIBlock: () => ReturnType
      unsetAIBlock: () => ReturnType
    }
  }
}

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

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-a': () => this.editor.commands.toggleAIBlock()
    }
  }
})
