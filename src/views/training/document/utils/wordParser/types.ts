/**
 * Word 文档解析器类型定义
 */

/**
 * 文件格式类型
 */
export type WordFileFormat = 'doc' | 'docx' | 'unknown'

/**
 * 文件类型选择
 */
export type WordFileType = 'normal' | 'redhead'

/**
 * Docx 文件验证结果
 */
export interface DocxValidationResult {
  valid: boolean
  error?: string
  hasAltChunk?: boolean // 是否包含 altChunk（自动检测红头文件）
  structure: {
    hasContentTypes: boolean
    hasDocument: boolean
    hasStyles: boolean
    hasRelationships: boolean
  }
}

/**
 * 解析进度回调函数类型
 */
export type ParseProgressCallback = (progress: number, text: string) => void

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 是否启用高保真解析 */
  highFidelity?: boolean
  /** 是否自动检测红头文件 */
  autoDetectRedhead?: boolean
  /** 进度回调 */
  onProgress?: ParseProgressCallback
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 解析后的 HTML 内容 */
  html: string
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 解析方式 */
  method?: string
}
