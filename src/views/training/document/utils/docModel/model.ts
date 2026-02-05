import type { DocHtmlBlock, DocMetadata, DocModel } from './types'

export const createHtmlDocModel = (html: string, metadata: DocMetadata): DocModel => {
  const block: DocHtmlBlock = { type: 'html', html }
  return {
    blocks: [block],
    metadata
  }
}

export const normalizeDocMetadata = (partial: Partial<DocMetadata>): DocMetadata => {
  return {
    source: partial.source ?? 'unknown',
    method: partial.method,
    fileName: partial.fileName,
    fileSize: partial.fileSize,
    hasAltChunk: partial.hasAltChunk,
    warnings: partial.warnings,
    zipEntries: partial.zipEntries
  }
}
