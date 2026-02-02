/**
 * 红头文件类型定义
 */

/**
 * 红头文件类型
 */
export type RedHeaderType = 'party' | 'government' | 'military' | 'custom'

/**
 * 红头文件结构
 */
export interface RedHeader {
  /** 红头文件类型 */
  type: RedHeaderType
  /** 红头文件 HTML 内容 */
  header: string
  /** 剩余内容 */
  rest: string
}

/**
 * 红头文件模板参数
 */
export interface RedHeaderTemplateParams {
  /** 发文单位 */
  organization: string
  /** 文件标题 */
  title: string
  /** 文号 */
  documentNumber: string
  /** 发文日期 */
  date: string
  /** 主送机关 */
  recipient?: string
  /** 密级 */
  securityLevel?: string
  /** 紧急程度 */
  urgencyLevel?: string
}

/**
 * 红头文件检测结果
 */
export interface RedHeaderDetectResult {
  /** 是否检测到红头文件 */
  isRedHeader: boolean
  /** 红头文件类型 */
  type?: RedHeaderType
  /** 红头文件 HTML 内容 */
  header?: string
  /** 剩余内容 */
  rest?: string
}
