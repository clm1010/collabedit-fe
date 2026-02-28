/**
 * 演训方案 API
 * 支持 Mock/Java 后端统一切换
 *
 * 切换方式：设置环境变量 VITE_USE_MOCK=true/false
 */
import { USE_MOCK } from '@/config/apiConfig'
import { javaRequest } from '@/config/axios/javaService'
import { isArray } from 'lodash-es'
import {
  performanceCategories,
  ALL_CATEGORY,
  type DocCategoryVO
} from '@/views/training/performance/config/categories'

export * from '@/types/performance'
export type { DocCategoryVO }

import type {
  TrainingPerformanceVO,
  TrainingPerformancePageReqVO,
  SubmitAuditReqVO,
  PublishDocReqVO,
  RejectRecordVO,
  RejectReqVO,
  PermissionCheckResponse,
  checkWriteData,
  UploadDocumentData,
  ExamRecordVO,
  ExamApplyReqVO
} from '@/types/performance'

const javaApi = {
  /**
   * 获取分页列表数据 - Java 后端
   */
  getPageList: async (params: TrainingPerformancePageReqVO) => {
    return await javaRequest.post('/getPlan/getPageList', params)
  },

  /**
   * 获取文档分类列表 - Java 后端
   * GET /dict/list?dictType=FILE_TYPE
   * 返回格式: [{ value: 'ZCQB', label: '侦察情报' }, ...]
   */
  getDocCategories: async (): Promise<{ data: DocCategoryVO[]; withAll: DocCategoryVO[] }> => {
    try {
      const res = await javaRequest.get('/dict/list', { dictType: 'FILE_TYPE' })
      const data: DocCategoryVO[] = res || []
      return {
        data,
        withAll: [ALL_CATEGORY, ...data]
      }
    } catch (error) {
      console.error('获取文档分类失败:', error)
      return {
        data: performanceCategories,
        withAll: [ALL_CATEGORY, ...performanceCategories]
      }
    }
  },

  /**
   * 新建筹划方案 - Java 后端
   */
  createNewData: async (data: TrainingPerformanceVO) => {
    return await javaRequest.postOriginal('/getPlan/saveData', data)
  },

  /**
   * 编辑演训方案数据 - Java 后端
   */
  updatePerformanceData: async (data: TrainingPerformanceVO) => {
    return await javaRequest.postOriginal('/getPlan/saveData', data)
  },

  /**
   * 删除演训方案 - Java 后端
   */
  deleteTrainingPerformance: async (ids: string | string[]) => {
    const idsArray = isArray(ids) ? ids : [ids]
    const requestData = idsArray.map((id) => id)
    return await javaRequest.post('/getPlan/delData', requestData)
  },

  /**
   * 提交审核 - Java 后端
   * POST /examRecord/submitReview
   */
  submitAudit: async (data: SubmitAuditReqVO) => {
    return await javaRequest.postOriginal('/examRecord/submitReview', data)
  },

  /**
   * 发布文档 - Java 后端
   */
  publishDocument: async (data: PublishDocReqVO) => {
    return await javaRequest.postOriginal('/getPlan/publishData', data)
  },

  /**
   * 写作权限校验 - Java 后端
   */
  checkWritePermission: async (data: checkWriteData): Promise<PermissionCheckResponse> => {
    return await javaRequest.postOriginal('/getPlan/getPermissionCheck', data)
  },

  /**
   * 获取文档文件流 - Java 后端
   */
  getFileStream: async (id: string): Promise<Blob | null> => {
    try {
      const response = await javaRequest.download('/getPlan/getFileStream', { id })
      if (response instanceof Blob && response.size > 0) {
        if (response.type.includes('application/json')) {
          const text = await response.text()
          try {
            const json = JSON.parse(text)
            if (json.data === null || json.code !== 200) {
              return null
            }
          } catch {
            // 不是有效的 JSON，当作二进制数据处理
          }
        }
        return response
      }
      return null
    } catch (error) {
      console.error('获取文件流失败:', error)
      return null
    }
  },

  /**
   * 上传文档文件 - Java 后端
   */
  uploadDocument: async (data: UploadDocumentData) => {
    const formData = new FormData()
    if (data.id) {
      formData.append('id', data.id)
    }
    formData.append('file', data.file)
    return await javaRequest.upload('/getPlan/saveFile', formData)
  },

  /**
   * 获取驳回历史
   */
  getRejectHistory: async (_id: string): Promise<{ data: RejectRecordVO[] }> => {
    return Promise.resolve({ data: [] })
  },

  /**
   * 驳回演训方案
   */
  rejectTrainingPerformance: async (_data: RejectReqVO) => {
    return Promise.resolve({ success: true, message: '驳回成功' })
  },

  /**
   * 导出演训方案
   */
  exportTrainingPerformance: async (_params: TrainingPerformancePageReqVO) => {
    return Promise.resolve({ data: [] })
  },

  /**
   * 获取演训数据列表（带分页）- Java 后端
   * POST /getPlan/getExerciseData
   */
  getExerciseData: async (params: {
    pageNo?: number
    pageSize?: number
    exerciseName?: string
    exerciseType?: string
    level?: string
    academy?: string
    city?: string
  }) => {
    return await javaRequest.post('/getPlan/getExerciseData', params)
  },

  /**
   * 获取审核记录列表 - Java 后端
   * GET /examRecord/getOpinion
   * @param id 当前表格数据id
   */
  getExamRecordList: async (id: string): Promise<{ data: ExamRecordVO[] }> => {
    return await javaRequest.get('/examRecord/getOpinion', { id })
  },

  /**
   * 审核/驳回操作 - Java 后端
   * POST /examRecord/examApply
   * @param data 审核/驳回参数
   */
  examApply: async (data: ExamApplyReqVO) => {
    return await javaRequest.postOriginal('/examRecord/examApply', data)
  }
}

const mockApi = {
  getPageList: async (params: TrainingPerformancePageReqVO) => {
    const { getPageList } = await import('@/mock/training/performance')
    const res = await getPageList(params)
    return res.data
  },

  getDocCategories: async (): Promise<{ data: DocCategoryVO[]; withAll: DocCategoryVO[] }> => {
    const { getDocCategories } = await import('@/mock/training/performance')
    return getDocCategories()
  },

  createNewData: async (data: TrainingPerformanceVO) => {
    const { createNewData } = await import('@/mock/training/performance')
    const res = await createNewData(data)
    return res
  },

  updatePerformanceData: async (data: any) => {
    const { updatePerformanceData } = await import('@/mock/training/performance')
    const res = await updatePerformanceData(data)
    return res
  },

  deleteTrainingPerformance: async (ids: string | string[]) => {
    const { deleteTrainingPerformance } = await import('@/mock/training/performance')
    const res = await deleteTrainingPerformance(ids)
    return res.data
  },

  submitAudit: async (data: SubmitAuditReqVO) => {
    const { submitAudit } = await import('@/mock/training/performance')
    const res = await submitAudit(data)
    return res
  },

  publishDocument: async (data: PublishDocReqVO) => {
    const { publishDocument } = await import('@/mock/training/performance')
    const res = await publishDocument(data)
    return res
  },

  checkWritePermission: async (data: checkWriteData): Promise<PermissionCheckResponse> => {
    const { checkWritePermission } = await import('@/mock/training/performance')
    return checkWritePermission(data)
  },

  getFileStream: async (id: string): Promise<Blob | null> => {
    const { getFileStream } = await import('@/mock/training/performance')
    return getFileStream(id)
  },

  uploadDocument: async (data: UploadDocumentData) => {
    const { uploadDocument } = await import('@/mock/training/performance')
    const res = await uploadDocument(data)
    return res
  },

  getRejectHistory: async (id: string): Promise<{ data: RejectRecordVO[] }> => {
    const { getRejectHistory } = await import('@/mock/training/performance')
    return getRejectHistory(id)
  },

  rejectTrainingPerformance: async (data: RejectReqVO) => {
    const { rejectTrainingPerformance } = await import('@/mock/training/performance')
    return rejectTrainingPerformance(data)
  },

  exportTrainingPerformance: async (params: TrainingPerformancePageReqVO) => {
    const { exportTrainingPerformance } = await import('@/mock/training/performance')
    const res = await exportTrainingPerformance(params)
    return res.data
  },

  getExerciseData: async (params: {
    pageNo?: number
    pageSize?: number
    exerciseName?: string
    exerciseType?: string
    level?: string
    academy?: string
    city?: string
  }) => {
    const { getExerciseData } = await import('@/mock/training/performance')
    const res = await getExerciseData(params)
    return res.data
  },

  getExamRecordList: async (id: string): Promise<{ data: ExamRecordVO[] }> => {
    const { getExamRecordList } = await import('@/mock/training/performance')
    return getExamRecordList(id)
  },

  examApply: async (data: ExamApplyReqVO) => {
    const { examApply } = await import('@/mock/training/performance')
    return examApply(data)
  }
}

const api = USE_MOCK ? mockApi : javaApi

/**
 * 获取分页列表数据
 * @param params 查询参数
 * @param params.tabType 标签页类型: 'recent' | 'review' | 'publish'
 */
export const getPageList = api.getPageList

/**
 * 获取文档分类列表
 */
export const getDocCategories = api.getDocCategories

/**
 * 新建筹划方案
 */
export const createNewData = api.createNewData

/**
 * 编辑演训方案数据
 */
export const updatePerformanceData = api.updatePerformanceData

/**
 * 删除演训方案
 */
export const deleteTrainingPerformance = api.deleteTrainingPerformance

/**
 * 提交审核
 */
export const submitAudit = api.submitAudit

/**
 * 发布文档
 */
export const publishDocument = api.publishDocument

/**
 * 写作权限校验
 */
export const checkWritePermission = api.checkWritePermission

/**
 * 获取文档文件流
 */
export const getFileStream = api.getFileStream

/**
 * 上传文档文件
 */
export const uploadDocument = api.uploadDocument

/**
 * 获取驳回历史
 */
export const getRejectHistory = api.getRejectHistory

/**
 * 驳回演训方案
 */
export const rejectTrainingPerformance = api.rejectTrainingPerformance

/**
 * 导出演训方案
 */
export const exportTrainingPerformance = api.exportTrainingPerformance

/**
 * 获取演训数据列表（带分页）- 用于演训数据选择弹窗
 * POST /getPlan/getExerciseData
 * @param params { pageNo: 1, pageSize: 10 }
 */
export const getExerciseData = api.getExerciseData

/**
 * 获取审核记录列表
 * GET /examRecord/getOpinion
 * @param id 当前表格数据id
 */
export const getExamRecordList = api.getExamRecordList

/**
 * 审核/驳回操作
 * POST /examRecord/examApply
 * @param data 审核/驳回参数 { apply, examResult, examOpinion, examuserId }
 */
export const examApply = api.examApply

export { performanceCategories } from '@/views/training/performance/config/categories'
