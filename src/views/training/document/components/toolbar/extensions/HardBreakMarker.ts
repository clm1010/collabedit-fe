import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

const buildDecorations = (doc: ProseMirrorNode): DecorationSet => {
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'hardBreak') {
      decorations.push(
        Decoration.widget(
          pos,
          () => {
            const marker = document.createElement('span')
            marker.className = 'hard-break-marker'
            marker.textContent = '↓'
            marker.contentEditable = 'false'
            return marker
          },
          { side: 0 }
        )
      )
    }
  })
  return DecorationSet.create(doc, decorations)
}

export const HardBreakMarker = Extension.create({
  name: 'hardBreakMarker',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hardBreakMarker'),
        state: {
          init(_, { doc }) {
            return buildDecorations(doc)
          },
          apply(tr, oldDecorations) {
            if (tr.docChanged) {
              return buildDecorations(tr.doc)
            }
            return oldDecorations.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})
