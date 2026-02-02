/**
 * 模板编辑器工具模块
 * 统一导出入口
 */

// 转换器
export { htmlToMarkdown, markdownToHtml } from './converters'
export {
  protectStyledTags,
  restoreStyledTags,
  encodeHtmlEntities,
  decodeHtmlEntities,
  createPlaceholderManager
} from './converters'
export type { StyledTagsProtection, PlaceholderItem } from './converters'

// 解析器
export {
  parseWordDocument,
  cleanWordHtml,
  mammothStyleMap,
  parseMarkdownFile,
  parseMarkdownBlob,
  isValidMarkdown,
  parseMarkdownDocument,
  markdownToHtmlMd
} from './parsers'

// 红头文件
export {
  extractRedHeader,
  detectRedHeaderType,
  hasRedHeader,
  extractRedHeaderFromMarkdown,
  createRedLine,
  createSimpleRedHeader,
  createGovernmentRedHeader,
  createPartyRedHeader,
  createRedHeader
} from './redHeader'
export type {
  RedHeaderType,
  RedHeader,
  RedHeaderTemplateParams,
  RedHeaderDetectResult
} from './redHeader'

// 编码工具
export {
  encodeToBase64,
  decodeFromBase64,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  blobToBase64,
  base64ToBlob
} from './encoding'

// 预览工具
export {
  generatePreviewHtml,
  openPreviewWindow,
  getPreviewStyles
} from './preview'

// 导出工具
export {
  exportMarkdown,
  exportHtml,
  exportFullHtml,
  exportText,
  exportJson,
  downloadBlob,
  downloadFromUrl
} from './export'
