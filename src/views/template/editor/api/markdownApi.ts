/**
 * Markdown 文档 API 服务
 * 直接调用 Java 后端，导出功能使用前端工具
 * WebSocket 协同编辑仍然通过 collaborative-middleware
 */
import { USE_MOCK } from '@/config/apiConfig'
import { javaRequest } from '@/config/axios/javaService'
import {
  exportToHtml,
  exportToJson,
  downloadBlob,
  DocumentExportInfo
} from '@/views/utils/documentExport'
import type { ElementItem } from '@/types/management'

export interface SubmitAuditReqVO {
  id: number | string
  flowId: string
  auditors: Record<string, string[]>
  comment?: string
}

export interface SubmitAuditResponse {
  code: number
  data?: any
  msg?: string
}

export interface MarkdownDocumentInfo {
  id: string
  title: string
  content?: string
  createTime: string
  updateTime: string
  version: string
  tags: string[]
  creatorId: number
  creatorName: string
}

export interface SaveMarkdownParams {
  id: string
  title?: string
  content: string
  creatorId?: number
  creatorName?: string
}

export interface ReferenceMaterial {
  id: number
  title: string
  date: string
  author: string
  content: string
}

export interface SaveMarkdownFileResponse {
  code: number
  data: any
  status: number
  msg?: string
}

/** POST /users/getMaterial */
export const getReferenceMaterials = async (docId: string): Promise<ReferenceMaterial[]> => {
  try {
    const res = await javaRequest.post<ReferenceMaterial[]>('/users/getMaterial', { id: docId })
    return res || []
  } catch (error) {
    console.error('获取参考素材失败:', error)
    return []
  }
}

/** POST /tbTemplate/saveFile */
export const saveMarkdownFile = async (
  id: string,
  file: Blob,
  filename: string = 'document.md'
): Promise<SaveMarkdownFileResponse> => {
  try {
    const formData = new FormData()
    formData.append('id', id)
    formData.append('file', file, filename)

    const res = await javaRequest.upload<SaveMarkdownFileResponse>('/tbTemplate/saveFile', formData)

    console.log('保存模板文档响应:', res)
    return res
  } catch (error) {
    console.error('保存模板文档失败:', error)
    throw error
  }
}

/** POST /examRecord/TemSubmit */
const submitAuditJava = async (data: SubmitAuditReqVO): Promise<SubmitAuditResponse> => {
  return await javaRequest.postOriginal('/examRecord/TemSubmit', data)
}

const submitAuditMock = async (data: SubmitAuditReqVO): Promise<SubmitAuditResponse> => {
  console.log('Mock 提交审核:', data)
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    code: 200,
    data: { success: true },
    msg: '提交审核成功'
  }
}

export const submitAudit = USE_MOCK ? submitAuditMock : submitAuditJava

export const exportMarkdownHtml = async (title: string, content: string): Promise<Blob> => {
  return exportToHtml(title, content, true)
}

export const exportMarkdownJson = async (
  id: string,
  title: string,
  content: string
): Promise<Blob> => {
  const doc: DocumentExportInfo = {
    id,
    title,
    content
  }
  return exportToJson(doc)
}

export const downloadMarkdownHtml = (title: string, content: string): void => {
  const blob = exportToHtml(title, content, true)
  downloadBlob(blob, `${title || '模板文档'}.html`)
}

export const downloadMarkdownJson = (doc: DocumentExportInfo): void => {
  const blob = exportToJson(doc)
  downloadBlob(blob, `${doc.title || '模板文档'}.json`)
}

const markdownCache = new Map<string, MarkdownDocumentInfo>()

export const getMarkdownDocument = async (docId: string): Promise<MarkdownDocumentInfo> => {
  let doc = markdownCache.get(docId)

  if (!doc) {
    doc = {
      id: docId,
      title: '新模板文档',
      content: '',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: 1,
      creatorName: '系统'
    }
    markdownCache.set(docId, doc)
  }

  return doc
}

export const saveMarkdownDocument = async (
  params: SaveMarkdownParams
): Promise<MarkdownDocumentInfo> => {
  const { id, title, content, creatorId, creatorName } = params

  let doc = markdownCache.get(id)

  if (doc) {
    doc.title = title || doc.title
    doc.content = content !== undefined ? content : doc.content
    doc.updateTime = new Date().toISOString()
    const versionNum = parseInt(doc.version.replace('V', '').replace('.0', '')) || 1
    doc.version = `V${versionNum + 1}.0`
  } else {
    doc = {
      id,
      title: title || '未命名模板',
      content: content || '',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: creatorId || 1,
      creatorName: creatorName || '用户'
    }
  }

  markdownCache.set(id, doc)
  return doc
}

export const deleteMarkdownDocument = async (docId: string): Promise<boolean> => {
  if (markdownCache.has(docId)) {
    markdownCache.delete(docId)
    return true
  }
  return false
}

export const getMarkdownDocumentList = async (): Promise<MarkdownDocumentInfo[]> => {
  return Array.from(markdownCache.values())
}

export interface ExamApplyReqVO {
  applyId: string
  examResult: string  // 1通过 2驳回
  examOpinion: string
  examUserId: string
}

export interface ExamApplyResponse {
  code: number
  data?: any
  msg?: string
}

/** POST /examRecord/examTem */
const examApplyJava = async (data: ExamApplyReqVO): Promise<ExamApplyResponse> => {
  return await javaRequest.postOriginal('/examRecord/examTem', data)
}

const examApplyMock = async (data: ExamApplyReqVO): Promise<ExamApplyResponse> => {
  console.log('Mock 审核/驳回:', data)
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    code: 200,
    data: { success: true },
    msg: data.examResult === '1' ? '审核通过' : '驳回成功'
  }
}

export const examApply = USE_MOCK ? examApplyMock : examApplyJava

/** GET /tbTemplate/getElement */
const getElementListJava = async (id: string): Promise<ElementItem[]> => {
  try {
    const res = await javaRequest.get<{ data?: ElementItem[] }>('/tbTemplate/getElement', {
      id
    })
    return (res as any)?.data || (res as any) || []
  } catch (error) {
    console.error('获取要素列表失败:', error)
    return []
  }
}

const getElementListMock = async (id: string): Promise<ElementItem[]> => {
  const { getElementList } = await import('@/mock/template/management')
  return getElementList(id)
}

export const getElementList = USE_MOCK ? getElementListMock : getElementListJava
