import { store } from '@/store'
import { defineStore } from 'pinia'
import type { DocMetadata } from '@/api/converter'
import { javaRequest } from '@/config/axios/javaService'

interface DocMetadataState {
  docId: string | null
  metadata: DocMetadata | null
  hasOriginalFile: boolean
}

export const useDocMetadataStore = defineStore('doc-metadata', {
  state: (): DocMetadataState => ({
    docId: null,
    metadata: null,
    hasOriginalFile: false,
  }),
  actions: {
    setMetadata(docId: string, metadata: DocMetadata) {
      this.docId = docId
      this.metadata = metadata
    },

    setHasOriginalFile(has: boolean) {
      this.hasOriginalFile = has
    },

    async loadMetadata(docId: string) {
      try {
        const res = await javaRequest.get('/getPlan/getDocMeta', { documentId: docId })
        if (res) {
          this.docId = docId
          this.metadata = res
        }
      } catch {
        // 204 or error, no metadata available
      }
    },

    async saveMetadata(docId: string, metadata: DocMetadata) {
      try {
        await javaRequest.postOriginal('/getPlan/saveDocMeta', {
          documentId: docId,
          metadata,
        })
        this.docId = docId
        this.metadata = metadata
      } catch (err) {
        console.warn('保存文档元数据失败:', err)
      }
    },

    async saveOriginalFile(docId: string, file: File | Blob) {
      try {
        const formData = new FormData()
        formData.append('id', docId)
        formData.append('file', file, file instanceof File ? file.name : 'original.docx')

        await javaRequest.upload('/getPlan/saveOriginalFile', formData)
        this.hasOriginalFile = true
      } catch (err) {
        console.warn('保存原始文件失败:', err)
      }
    },

    /**
     * 选择性保存高保真方案：查询后端是否已存在原始 DOCX。
     * 成功时同步更新 `hasOriginalFile` 状态，并返回布尔值，供调用方决定是否补传。
     * 出错不抛异常，返回 false 让调用方走"兜底尝试上传"路径。
     */
    async checkHasOriginalFile(docId: string): Promise<boolean> {
      try {
        const res = await javaRequest.get<{ hasOriginalFile: boolean }>(
          '/getPlan/hasOriginalFile',
          { id: docId }
        )
        const has = !!res?.hasOriginalFile
        this.hasOriginalFile = has
        return has
      } catch (err) {
        console.warn('查询原始文件状态失败:', err)
        return false
      }
    },

    clear() {
      this.docId = null
      this.metadata = null
      this.hasOriginalFile = false
    },
  },
})

export const useDocMetadataStoreWithOut = () => {
  return useDocMetadataStore(store)
}
