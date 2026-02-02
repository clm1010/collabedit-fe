/**
 * Word 文档解析工具入口
 * 保持对外 API 兼容，实际实现已拆分到子模块
 */

export * from './wordParser/types'
export * from './wordParser.shared'
export * from './wordParser.postprocess'
export * from './wordParser.mammoth'
export * from './wordParser.preview'
export * from './wordParser.redhead'
export * from './wordParser.ooxml'
export * from './wordParser.pipeline'
