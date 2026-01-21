/**
 * Word 文档解析器模块
 *
 * 此模块整合了多种 Word 文档解析方案:
 * 1. docx-preview 高保真解析 (95%+ 保真度)
 * 2. 增强 OOXML 解析 (90%+ 保真度)
 * 3. 红头文件 - altChunk HTML 提取 (98%+ 还原度)
 * 4. Web Worker 非阻塞解析 (大文件支持)
 * 5. mammoth 后备方案 (70% 保真度)
 *
 * 使用方式:
 * ```ts
 * import { parseFileContent, smartParseDocument } from '@/views/training/document/utils/wordParser'
 * ```
 */

// 导出类型定义
export * from './types'

// 导出工具函数
export * from './utils'

// 从原始文件重新导出（向后兼容）
// 注意：后续重构时可逐步将这些函数迁移到对应的子模块
export {
  // mammoth 相关
  mammothStyleMap,
  parseWordDocument,

  // 主要解析函数
  parseFileContent,
  validateDocxFile,

  // OOXML 解析
  parseOoxmlDocument,
  parseOoxmlDocumentEnhanced,

  // 红头文件解析
  isRedHeadDocument,
  parseRedHeadDocument,

  // 智能解析
  parseWordDocumentSmart,
  smartParseDocument,

  // docx-preview 解析
  parseWithDocxPreview,

  // Worker 解析
  parseWithWorker
} from '../wordParser.ts'
