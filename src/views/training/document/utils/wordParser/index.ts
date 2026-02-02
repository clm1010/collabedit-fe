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

export * from './types'
export * from './utils'
export * from '../wordParser'
