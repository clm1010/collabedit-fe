export type WordFileFormat = 'doc' | 'docx' | 'unknown'

export type WordFileType = 'normal' | 'redhead'

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

export type ParseProgressCallback = (progress: number, text: string) => void

export interface ParseOptions {
  /** 是否启用高保真解析 */
  highFidelity?: boolean
  /** 是否自动检测红头文件 */
  autoDetectRedhead?: boolean
  /** 进度回调 */
  onProgress?: ParseProgressCallback
}

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
