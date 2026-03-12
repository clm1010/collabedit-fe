import { inject, computed, ref, watchEffect, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { EditorKey } from './types'

export function useEditor(): ComputedRef<Editor | undefined> {
  const editorRef = inject<Ref<Editor | undefined>>(EditorKey)
  return computed(() => editorRef?.value)
}

function getEditorPlugins(editor: Editor) {
  const view = (editor as any).view
  if (!view) return null
  const state = view.state
  const plugins: any[] = state?.plugins || []

  let um: any = null
  let syncPluginKey: any = null

  for (const p of plugins) {
    if (!um && p.key?.includes?.('y-undo')) {
      const ps = p.getState(state)
      um = ps?.undoManager ?? null
    }
    if (!syncPluginKey && p.key?.includes?.('y-sync') && !p.key?.includes?.('cursor')) {
      syncPluginKey = p.spec?.key ?? null
    }
  }
  return { um, syncPluginKey }
}

function patchUndoManagerTracking(um: any): boolean {
  if (!um || um.__patchedV3) return false
  const originalHandler = um.afterTransactionHandler
  if (!originalHandler) return false

  const ydoc = um.doc
  if (!ydoc) return false

  um.__patchedV3 = true

  ydoc.off('afterTransaction', originalHandler)

  const patchedHandler = (transaction: any) => {
    const origin = transaction.origin

    // Fix 1: ySyncPluginKey reference mismatch (module duplication)
    if (origin && typeof origin === 'object' && origin.key && !um.trackedOrigins.has(origin)) {
      for (const tracked of um.trackedOrigins) {
        if (tracked && typeof tracked === 'object' && tracked.key === origin.key) {
          um.trackedOrigins.add(origin)
          break
        }
      }
    }

    // Fix 2: During undo/redo, the transaction origin is the UndoManager
    // instance used internally by popStackItem. Due to .bind() or prototype
    // chain issues, this may be a different reference than `um`.
    // Ensure it is always tracked so the handler doesn't early-return.
    if ((um.undoing || um.redoing) && origin && !um.trackedOrigins.has(origin)) {
      um.trackedOrigins.add(origin)
    }

    // Ensure um itself is always tracked
    if (!um.trackedOrigins.has(um)) {
      um.trackedOrigins.add(um)
    }

    return originalHandler.call(um, transaction)
  }

  um.afterTransactionHandler = patchedHandler
  ydoc.on('afterTransaction', patchedHandler)

  return true
}

export function useEditorState() {
  const editor = useEditor()
  const canUndo = ref(false)
  const canRedo = ref(false)

  watchEffect((onCleanup) => {
    const e = editor.value
    if (!e) return

    let rafId = 0
    const info = getEditorPlugins(e)
    if (!info) return
    const { um, syncPluginKey } = info

    const syncFromUndoManager = () => {
      if (um) {
        canUndo.value = um.undoStack.length > 0
        canRedo.value = um.redoStack.length > 0
      }
    }

    const scheduleSync = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        syncFromUndoManager()
      })
    }

    if (um) {
      if (syncPluginKey && !um.trackedOrigins.has(syncPluginKey)) {
        um.trackedOrigins.add(syncPluginKey)
      }
      if (!um.trackedOrigins.has(um)) {
        um.trackedOrigins.add(um)
      }
      patchUndoManagerTracking(um)

      um.on('stack-item-added', syncFromUndoManager)
      um.on('stack-item-popped', syncFromUndoManager)
      um.on('stack-cleared', syncFromUndoManager)
      syncFromUndoManager()

      e.on('transaction', scheduleSync)

      onCleanup(() => {
        e.off('transaction', scheduleSync)
        if (rafId) cancelAnimationFrame(rafId)
        um.off('stack-item-added', syncFromUndoManager)
        um.off('stack-item-popped', syncFromUndoManager)
        um.off('stack-cleared', syncFromUndoManager)
      })
    } else {
      e.on('transaction', scheduleSync)
      onCleanup(() => {
        e.off('transaction', scheduleSync)
        if (rafId) cancelAnimationFrame(rafId)
      })
    }
  })

  return { editor, canUndo, canRedo }
}
