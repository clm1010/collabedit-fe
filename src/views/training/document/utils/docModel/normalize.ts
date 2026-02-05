import type { DocMetadata } from './types'
import { parseHtmlToDocModel } from './htmlParser'
import { serializeDocModelToHtml } from './serializer'

export const normalizeHtmlThroughDocModel = (html: string, metadata: DocMetadata): string => {
  const model = parseHtmlToDocModel(html, metadata)
  return serializeDocModelToHtml(model)
}
