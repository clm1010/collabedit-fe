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

// 提交审核请求参数接口
export interface SubmitAuditReqVO {
  id: number | string // 模板ID
  flowId: string // 流程ID
  auditors: Record<string, string[]> // 节点审核人 { node1: ['user1'], node2: ['user2', 'user3'] }
  comment?: string // 审核说明
}

// 提交审核响应接口
export interface SubmitAuditResponse {
  code: number
  data?: any
  msg?: string
}

// Markdown 文档信息接口
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

// Markdown 文档保存参数
export interface SaveMarkdownParams {
  id: string
  title?: string
  content: string
  creatorId?: number
  creatorName?: string
}

// 参考素材
export interface ReferenceMaterial {
  id: number
  title: string
  date: string
  author: string
  content: string
}

// 保存 Markdown 文件响应接口
export interface SaveMarkdownFileResponse {
  code: number
  data: any
  status: number
  msg?: string
}

// ==================== Java 后端 API 直接调用 ====================

/**
 * 获取参考素材列表 - 直接调用 Java 后端
 * POST /users/getMaterial
 * @param docId 文档ID
 */
export const getReferenceMaterials = async (docId: string): Promise<ReferenceMaterial[]> => {
  try {
    const res = await javaRequest.post<ReferenceMaterial[]>('/users/getMaterial', { id: docId })
    return res || []
  } catch (error) {
    console.error('获取参考素材失败:', error)
    return []
  }
}

/**
 * 保存 Markdown 文件到后端 - 直接调用 Java 后端
 * POST /tbTemplate/saveFile
 * @param id 文档ID（模板ID）
 * @param file Blob 文件流
 * @param filename 文件名（可选）
 */
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

/**
 * 提交审核 - Java 后端
 * POST /examRecord/TemSubmit
 * @param data 审核参数
 */
const submitAuditJava = async (data: SubmitAuditReqVO): Promise<SubmitAuditResponse> => {
  return await javaRequest.postOriginal('/examRecord/TemSubmit', data)
}

/**
 * 提交审核 - Mock 实现
 * @param data 审核参数
 */
const submitAuditMock = async (data: SubmitAuditReqVO): Promise<SubmitAuditResponse> => {
  console.log('Mock 提交审核:', data)
  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    code: 200,
    data: { success: true },
    msg: '提交审核成功'
  }
}

/**
 * 提交审核（自动切换 Mock/Java）
 * POST /examRecord/TemSubmit
 * @param data 审核参数 { id, flowId, auditors, comment }
 */
export const submitAudit = USE_MOCK ? submitAuditMock : submitAuditJava

// ==================== 前端实现的功能 ====================

/**
 * 导出 Markdown 文档为 HTML - 前端实现
 * @param title 文档标题
 * @param content 文档内容
 */
export const exportMarkdownHtml = async (title: string, content: string): Promise<Blob> => {
  return exportToHtml(title, content, true)
}

/**
 * 导出 Markdown 文档为 JSON - 前端实现
 * @param id 文档ID
 * @param title 文档标题
 * @param content 文档内容
 */
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

/**
 * 下载 HTML 文件
 * @param title 文档标题
 * @param content 文档内容
 */
export const downloadMarkdownHtml = (title: string, content: string): void => {
  const blob = exportToHtml(title, content, true)
  downloadBlob(blob, `${title || '模板文档'}.html`)
}

/**
 * 下载 JSON 文件
 * @param doc 文档信息
 */
export const downloadMarkdownJson = (doc: DocumentExportInfo): void => {
  const blob = exportToJson(doc)
  downloadBlob(blob, `${doc.title || '模板文档'}.json`)
}

// ==================== 本地文档管理（用于协同编辑场景） ====================

// 本地 Markdown 文档缓存
const markdownCache = new Map<string, MarkdownDocumentInfo>()

/**
 * 获取 Markdown 文档（本地缓存，用于协同编辑初始化）
 * @param docId 文档ID
 */
export const getMarkdownDocument = async (docId: string): Promise<MarkdownDocumentInfo> => {
  let doc = markdownCache.get(docId)

  if (!doc) {
    // 创建新文档
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

/**
 * 保存 Markdown 文档到本地缓存
 * @param params 保存参数
 */
export const saveMarkdownDocument = async (
  params: SaveMarkdownParams
): Promise<MarkdownDocumentInfo> => {
  const { id, title, content, creatorId, creatorName } = params

  let doc = markdownCache.get(id)

  if (doc) {
    // 更新现有文档
    doc.title = title || doc.title
    doc.content = content !== undefined ? content : doc.content
    doc.updateTime = new Date().toISOString()
    // 增加版本号
    const versionNum = parseInt(doc.version.replace('V', '').replace('.0', '')) || 1
    doc.version = `V${versionNum + 1}.0`
  } else {
    // 创建新文档
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

/**
 * 删除 Markdown 文档（本地缓存）
 * @param docId 文档ID
 */
export const deleteMarkdownDocument = async (docId: string): Promise<boolean> => {
  if (markdownCache.has(docId)) {
    markdownCache.delete(docId)
    return true
  }
  return false
}

/**
 * 获取 Markdown 文档列表（本地缓存）
 */
export const getMarkdownDocumentList = async (): Promise<MarkdownDocumentInfo[]> => {
  return Array.from(markdownCache.values())
}

// ==================== 审核/驳回操作 API ====================

// 审核/驳回请求参数接口
export interface ExamApplyReqVO {
  applyId: string // 当前数据 ID
  examResult: string // 审核结果 1通过 2驳回
  examOpinion: string // 审核意见/驳回原因
  examUserId: string // 审批用户id
}

// 审核/驳回响应接口
export interface ExamApplyResponse {
  code: number
  data?: any
  msg?: string
}

/**
 * 审核/驳回操作 - Java 后端
 * POST /examRecord/examTem
 * @param data 审核/驳回参数
 */
const examApplyJava = async (data: ExamApplyReqVO): Promise<ExamApplyResponse> => {
  return await javaRequest.postOriginal('/examRecord/examTem', data)
}

/**
 * 审核/驳回操作 - Mock 实现
 * @param data 审核/驳回参数
 */
const examApplyMock = async (data: ExamApplyReqVO): Promise<ExamApplyResponse> => {
  console.log('Mock 审核/驳回:', data)
  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    code: 200,
    data: { success: true },
    msg: data.examResult === '1' ? '审核通过' : '驳回成功'
  }
}

/**
 * 审核/驳回操作（自动切换 Mock/Java）
 * POST /examRecord/examTem
 * @param data 审核/驳回参数 { applyId, examResult, examOpinion, examUserId }
 */
export const examApply = USE_MOCK ? examApplyMock : examApplyJava

// ==================== 自定义要素 API ====================

/**
 * 获取自定义要素列表 - Java 后端
 * GET /tbTemplate/getElement
 * @param id 记录ID
 */
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

/**
 * 获取自定义要素列表 - Mock 实现
 * @param id 记录ID
 */
const getElementListMock = async (id: string): Promise<ElementItem[]> => {
  const { getElementList } = await import('@/mock/template/management')
  return getElementList(id)
}

/**
 * 获取自定义要素列表（自动切换 Mock/Java）
 * GET /getPlan/getElement
 * @param id 记录ID
 */
export const getElementList = USE_MOCK ? getElementListMock : getElementListJava
