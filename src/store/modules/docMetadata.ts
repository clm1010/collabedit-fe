import { store } from '@/store'
import { defineStore } from 'pinia'
import type { DocMetadata } from '@/api/converter'
import { javaRequest } from '@/config/axios/javaService'

interface DocMetadataState {
  docId: string | null
  metadata: DocMetadata | null
  hasOriginalFile: boolean
  converterAvailable: boolean
}

export const useDocMetadataStore = defineStore('doc-metadata', {
  state: (): DocMetadataState => ({
    docId: null,
    metadata: null,
    hasOriginalFile: false,
    converterAvailable: false,
  }),
  actions: {
    setConverterStatus(available: boolean) {
      this.converterAvailable = available
    },

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
