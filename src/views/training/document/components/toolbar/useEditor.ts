/**
 * 编辑器注入 composable
 */
import { inject, computed, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { EditorKey } from './types'

/**
 * 在工具栏组件中获取编辑器实例
 */
export function useEditor(): ComputedRef<Editor | undefined> {
  const editorRef = inject<Ref<Editor | undefined>>(EditorKey)

  return computed(() => editorRef?.value)
}
