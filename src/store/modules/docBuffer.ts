import { store } from '@/store'
import { defineStore } from 'pinia'

interface DocBufferState {
  docId: string | null
  buffer: ArrayBuffer | null
  /**
   * 选择性保存高保真方案：缓存原始 DOCX 字节，避免每次导出都重新 fetch。
   * 仅当 originalDocId === 当前文档 id 时才认为命中，切换文档会自动失效。
   */
  originalDocId: string | null
  originalDocx: ArrayBuffer | null
}

/**
 * 文档 ArrayBuffer 内存缓存 Store
 *
 * 用于在 SPA 路由跳转（列表页 → 编辑器）间传递文件流的 ArrayBuffer，
 * 替代原来的 IndexedDB + base64 方案。
 * - 页面刷新后内存自动清空，编辑器会从后端重新获取文件流。
 * - buffer：用户最近上传的 DOCX 字节，供编辑器首屏解析使用。
 * - originalDocx：保存到后端的"原始 DOCX"字节副本，导出时作为选择性保存的基准。
 */
export const useDocBufferStore = defineStore('doc-buffer', {
  state: (): DocBufferState => ({
    docId: null,
    buffer: null,
    originalDocId: null,
    originalDocx: null
  }),
  actions: {
    setBuffer(docId: string, buffer: ArrayBuffer) {
      this.docId = docId
      this.buffer = buffer
    },
    getBuffer(docId: string): ArrayBuffer | null {
      if (this.docId === docId && this.buffer) {
        return this.buffer
      }
      return null
    },
    clearBuffer() {
      this.docId = null
      this.buffer = null
    },
    // 选择性保存高保真：设置原始 DOCX 缓存。
    setOriginalDocx(docId: string, buffer: ArrayBuffer) {
      this.originalDocId = docId
      this.originalDocx = buffer
    },
    // 仅当 docId 匹配时返回缓存；切换文档或首次访问返回 null，由调用方决定是否 fetch。
    getOriginalDocx(docId: string): ArrayBuffer | null {
      if (this.originalDocId === docId && this.originalDocx) {
        return this.originalDocx
      }
      return null
    },
    clearOriginalDocx() {
      this.originalDocId = null
      this.originalDocx = null
    }
  }
})

export const useDocBufferStoreWithOut = () => {
  return useDocBufferStore(store)
}
