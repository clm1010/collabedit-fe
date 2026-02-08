import { store } from '@/store'
import { defineStore } from 'pinia'

interface DocBufferState {
  docId: string | null
  buffer: ArrayBuffer | null
}

/**
 * 文档 ArrayBuffer 内存缓存 Store
 *
 * 用于在 SPA 路由跳转（列表页 → 编辑器）间传递文件流的 ArrayBuffer，
 * 替代原来的 IndexedDB + base64 方案。
 * - 页面刷新后内存自动清空，编辑器会从后端重新获取文件流。
 */
export const useDocBufferStore = defineStore('doc-buffer', {
  state: (): DocBufferState => ({
    docId: null,
    buffer: null
  }),
  actions: {
    /** 存入文档的 ArrayBuffer */
    setBuffer(docId: string, buffer: ArrayBuffer) {
      this.docId = docId
      this.buffer = buffer
    },
    /** 按文档 ID 取出 ArrayBuffer（不匹配则返回 null） */
    getBuffer(docId: string): ArrayBuffer | null {
      if (this.docId === docId && this.buffer) {
        return this.buffer
      }
      return null
    },
    /** 清空缓存，释放内存 */
    clearBuffer() {
      this.docId = null
      this.buffer = null
    }
  }
})

export const useDocBufferStoreWithOut = () => {
  return useDocBufferStore(store)
}
