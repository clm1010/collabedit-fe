export { htmlToMarkdown, markdownToHtml } from './converters'
export {
  protectStyledTags,
  restoreStyledTags,
  encodeHtmlEntities,
  decodeHtmlEntities,
  createPlaceholderManager
} from './converters'
export type { StyledTagsProtection, PlaceholderItem } from './converters'

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

export {
  encodeToBase64,
  decodeFromBase64,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  blobToBase64,
  base64ToBlob
} from './encoding'

export {
  generatePreviewHtml,
  openPreviewWindow,
  getPreviewStyles
} from './preview'

export {
  exportMarkdown,
  exportHtml,
  exportFullHtml,
  exportText,
  exportJson,
  downloadBlob,
  downloadFromUrl
} from './export'
