/**
 * 文档 API 服务
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

// 提交审核请求参数接口
export interface SubmitAuditReqVO {
  id: number | string // 文档ID
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

// 文档信息接口
export interface DocumentInfo {
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

// 文档保存参数
export interface SaveDocumentParams {
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

// 保存文档响应接口
export interface SaveDocumentFileResponse {
  code: number
  data: any
  status: number
  msg?: string
}

// .doc 转换响应接口
export interface DocConvertResponse {
  code: number
  data: string // 转换后的 HTML 内容
  status: number
  msg?: string
}

// ==================== Java 后端 API 直接调用 ====================

/**
 * 转换 .doc 文件为 HTML - 调用 Java 后端
 * POST /getPlan/convertDoc
 *
 * 说明：由于前端 mammoth.js 只支持 .docx 格式，旧版 .doc 格式需要后端转换
 * 后端可使用 Apache POI 或 LibreOffice 进行转换
 *
 * @param file .doc 文件
 * @returns 转换后的 HTML 内容
 */
export const convertDocToHtml = async (file: File): Promise<string> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await javaRequest.upload<DocConvertResponse>('/getPlan/convertDoc', formData)

    console.log('.doc 转换响应:', res)

    // 处理响应
    if (res && (res.code === 200 || res.code === 0)) {
      return res.data || ''
    }

    throw new Error(res?.msg || '.doc 文件转换失败')
  } catch (error) {
    console.error('.doc 文件转换失败:', error)
    throw error
  }
}

/**
 * 获取参考素材列表 - 直接调用 Java 后端
 * POST /getPlan/getMaterial
 * @param docId 文档ID
 */
export const getReferenceMaterials = async (docId: string): Promise<ReferenceMaterial[]> => {
  try {
    const res = await javaRequest.post<ReferenceMaterial[]>('/getPlan/getMaterial', {
      id: docId
    })
    return res || []
  } catch (error) {
    console.error('获取参考素材失败:', error)
    return []
  }
}

/**
 * 保存文档文件到后端 - 直接调用 Java 后端
 * POST /getPlan/saveFile
 * @param id 文档ID
 * @param file Blob 文件流
 * @param filename 文件名（可选）
 */
export const saveDocumentFile = async (
  id: string,
  file: Blob,
  filename: string = 'document.docx'
): Promise<SaveDocumentFileResponse> => {
  try {
    const formData = new FormData()
    formData.append('id', id)
    formData.append('file', file, filename)

    const res = await javaRequest.upload<SaveDocumentFileResponse>('/getPlan/saveFile', formData)

    console.log('保存文档响应:', res)
    return res
  } catch (error) {
    console.error('保存文档失败:', error)
    throw error
  }
}

// ==================== 前端实现的功能 ====================

/**
 * 导出文档为 HTML - 前端实现
 * @param title 文档标题
 * @param content 文档内容
 */
export const exportDocumentHtml = async (title: string, content: string): Promise<Blob> => {
  return exportToHtml(title, content, false)
}

/**
 * 导出文档为 JSON - 前端实现
 * @param id 文档ID
 * @param title 文档标题
 * @param content 文档内容
 */
export const exportDocumentJson = async (
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
export const downloadDocumentHtml = (title: string, content: string): void => {
  const blob = exportToHtml(title, content, false)
  downloadBlob(blob, `${title || '文档'}.html`)
}

/**
 * 下载 JSON 文件
 * @param doc 文档信息
 */
export const downloadDocumentJson = (doc: DocumentExportInfo): void => {
  const blob = exportToJson(doc)
  downloadBlob(blob, `${doc.title || '文档'}.json`)
}

// ==================== 本地文档管理（用于协同编辑场景） ====================

// 本地文档缓存
const documentCache = new Map<string, DocumentInfo>()

/**
 * 获取文档（本地缓存，用于协同编辑初始化）
 * @param docId 文档ID
 */
export const getDocument = (docId: string): DocumentInfo => {
  let doc = documentCache.get(docId)

  if (!doc) {
    // 创建新文档
    doc = {
      id: docId,
      title: '新文档',
      content: '<p></p>',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: 1,
      creatorName: '系统'
    }
    documentCache.set(docId, doc)
  }

  return doc
}

/**
 * 保存文档到本地缓存
 * @param params 保存参数
 */
export const saveDocument = async (params: SaveDocumentParams): Promise<DocumentInfo> => {
  const { id, title, content, creatorId, creatorName } = params

  let doc = documentCache.get(id)

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
      title: title || '未命名文档',
      content: content || '<p></p>',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: creatorId || 1,
      creatorName: creatorName || '用户'
    }
  }

  documentCache.set(id, doc)
  return doc
}

/**
 * 删除文档（本地缓存）
 * @param docId 文档ID
 */
export const deleteDocument = async (docId: string): Promise<boolean> => {
  if (documentCache.has(docId)) {
    documentCache.delete(docId)
    return true
  }
  return false
}

/**
 * 获取文档列表（本地缓存）
 */
export const getDocumentList = async (): Promise<DocumentInfo[]> => {
  return Array.from(documentCache.values())
}

// ==================== 提交审核 API ====================

/**
 * 提交审核 - Java 后端
 * POST /examRecord/submitReview
 * @param data 审核参数
 */
const submitAuditJava = async (data: SubmitAuditReqVO): Promise<SubmitAuditResponse> => {
  return await javaRequest.postOriginal('/examRecord/submitReview', data)
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
 * POST /examRecord/submitReview
 * @param data 审核参数 { id, flowId, auditors, comment }
 */
export const submitAudit = USE_MOCK ? submitAuditMock : submitAuditJava

// ==================== 审核/驳回操作 API ====================

// 审核/驳回请求参数接口
export interface ExamApplyReqVO {
  applyId: string // 当前数据 ID
  examResult: string // 审核结果 1通过 2驳回
  examOpinion: string // 审核意见/驳回原因
  examuserId: string // 审批用户id
}

// 审核/驳回响应接口
export interface ExamApplyResponse {
  code: number
  data?: any
  msg?: string
}

/**
 * 审核/驳回操作 - Java 后端
 * POST /examRecord/examApply
 * @param data 审核/驳回参数
 */
const examApplyJava = async (data: ExamApplyReqVO): Promise<ExamApplyResponse> => {
  return await javaRequest.postOriginal('/examRecord/examApply', data)
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
 * POST /examRecord/examApply
 * @param data 审核/驳回参数 { applyId, examResult, examOpinion, examuserId }
 */
export const examApply = USE_MOCK ? examApplyMock : examApplyJava
