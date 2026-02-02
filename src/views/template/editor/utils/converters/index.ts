/**
 * 转换器模块导出
 */

export { htmlToMarkdown } from './htmlToMarkdown'
export { markdownToHtml } from './markdownToHtml'
export {
  protectStyledTags,
  restoreStyledTags,
  encodeHtmlEntities,
  decodeHtmlEntities,
  createPlaceholderManager,
  type StyledTagsProtection,
  type PlaceholderItem
} from './shared'
