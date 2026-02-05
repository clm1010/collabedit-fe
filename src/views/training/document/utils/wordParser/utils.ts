/**
 * Word 文档解析工具函数
 * 重新导出 wordParser.shared.ts 中的函数，保持向后兼容
 */

// 重新导出共享模块中的函数
export {
  isDocFormat,
  isZipFormat,
  detectWordFormat,
  base64ToUint8Array,
  isHtmlFormat,
  isMhtmlFormat,
  isRtfFormat,
  normalizeColor,
  validateAndFixImages
} from '../wordParser.shared'

// 重新导出 postprocess 中的 cleanWordHtml
export { cleanWordHtml } from '../wordParser.postprocess'
