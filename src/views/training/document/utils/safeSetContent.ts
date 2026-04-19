/**
 * 统一的 Tiptap setContent 容错封装。
 *
 * 在协同/导入路径中，转换器可能返回包含未注册节点（例如旧版 `tocEntry` 或
 * 结构不兼容的属性）的 JSON。直接调用 `editor.commands.setContent(json)` 一旦
 * ProseMirror 校验失败就会抛出，让编辑器停留在空白状态。
 *
 * 本模块提供三级降级：
 *   1. 优先使用 `createNodeFromContent` + 单事务替换，设置 `errorOnInvalidContent: false`
 *      让未知节点/属性被静默丢弃而不是抛错；
 *   2. 失败时退回到 `editor.commands.setContent(json, true)`（触发 update 事件）；
 *   3. 再次失败则恢复到调用前的备份（`setContent(backup, false)` -> `true`）。
 *
 * 调用方需确保 editor 已就绪；本函数不关心协同层（如 Yjs），只保证单端的内容写入
 * 不会把文档写坏。若前两级成功，会尽力运行 `fixTables()` 以修复合并单元格等问题。
 */

import type { Editor } from '@tiptap/core'
import { createNodeFromContent } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'

export interface SafeSetContentOptions {
  /** 成功后是否尝试运行 fixTables 以修复表格结构，默认 true */
  fixTables?: boolean
  /** 自定义日志前缀，便于定位来源 */
  logPrefix?: string
}

export interface SafeSetContentResult {
  success: boolean
  usedFallback: boolean
  restored: boolean
  error?: unknown
}

/**
 * 以容错方式把一份 Tiptap JSON 文档应用到编辑器。
 * 失败时会尝试把文档恢复到调用前的状态，避免编辑器变空。
 */
export function safeSetContent(
  editor: Editor,
  jsonContent: Record<string, unknown>,
  options: SafeSetContentOptions = {}
): SafeSetContentResult {
  const { fixTables = true, logPrefix = '[safeSetContent]' } = options
  const backup = editor.getJSON()

  editor.setEditable(false)
  try {
    try {
      const { state, view, schema } = editor
      const tr = state.tr
      const newContent = createNodeFromContent(jsonContent, schema, {
        errorOnInvalidContent: false
      })
      tr.replaceWith(0, tr.doc.content.size, newContent as any)
      try {
        tr.setSelection(Selection.atStart(tr.doc))
      } catch {
        // 选区设置失败可忽略，不影响内容
      }
      view.dispatch(tr)
      if (fixTables) {
        try { editor.chain().fixTables().run() } catch { /* 忽略 fixTables 失败 */ }
      }
      return { success: true, usedFallback: false, restored: false }
    } catch (primaryErr) {
      console.warn(`${logPrefix} 主路径失败，尝试 setContent 降级:`, primaryErr)
      try {
        editor.commands.setContent(jsonContent as any, {
          emitUpdate: true,
          errorOnInvalidContent: false,
        })
        if (fixTables) {
          try { editor.chain().fixTables().run() } catch {}
        }
        return { success: true, usedFallback: true, restored: false }
      } catch (fallbackErr) {
        console.error(`${logPrefix} 降级仍失败，恢复备份:`, fallbackErr)
        let restored = false
        try {
          editor.commands.setContent(backup as any, {
            emitUpdate: false,
            errorOnInvalidContent: false,
          })
          restored = true
        } catch {
          try {
            editor.commands.setContent(backup as any, {
              emitUpdate: true,
              errorOnInvalidContent: false,
            })
            restored = true
          } catch (restoreErr) {
            console.error(`${logPrefix} 恢复文档失败:`, restoreErr)
          }
        }
        return {
          success: false,
          usedFallback: true,
          restored,
          error: fallbackErr,
        }
      }
    }
  } finally {
    editor.setEditable(true)
  }
}
