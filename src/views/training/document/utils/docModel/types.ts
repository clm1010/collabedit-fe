export type DocBlock =
  | DocParagraphBlock
  | DocHeadingBlock
  | DocListBlock
  | DocBlockquoteBlock
  | DocCodeBlock
  | DocTableBlock
  | DocImageBlock
  | DocPageBreakBlock
  | DocHtmlBlock

export interface DocModel {
  blocks: DocBlock[]
  headers?: DocSectionPart[]
  footers?: DocSectionPart[]
  footnotes?: DocFootnote[]
  endnotes?: DocFootnote[]
  metadata: DocMetadata
}

export interface DocMetadata {
  source: 'ooxml' | 'redhead' | 'preview' | 'mammoth' | 'html' | 'docx4js' | 'unknown'
  method?: string
  fileName?: string
  fileSize?: number
  hasAltChunk?: boolean
  warnings?: string[]
  zipEntries?: string[]
}

export interface DocSectionPart {
  blocks: DocBlock[]
}

export interface DocFootnote {
  id?: number
  blocks: DocBlock[]
}

export interface DocParagraphBlock {
  type: 'paragraph'
  runs: DocRun[]
  style?: ParagraphStyle
}

export interface DocHeadingBlock {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  runs: DocRun[]
  style?: ParagraphStyle
}

export interface DocListBlock {
  type: 'list'
  kind: 'bullet' | 'ordered' | 'task'
  items: DocListItem[]
}

export interface DocListItem {
  blocks: DocBlock[]
  checked?: boolean
}

export interface DocBlockquoteBlock {
  type: 'blockquote'
  blocks: DocBlock[]
}

export interface DocCodeBlock {
  type: 'code'
  text: string
  language?: string
}

export interface DocRun {
  text: string
  style?: RunStyle
  footnoteId?: number
  endnoteId?: number
}

export interface DocTableBlock {
  type: 'table'
  rows: DocTableRow[]
  colWidths?: number[]
  minWidth?: number
}

export interface DocTableRow {
  cells: DocTableCell[]
}

export interface DocTableCell {
  blocks: DocBlock[]
  colspan?: number
  rowspan?: number
}

export interface DocImageBlock {
  type: 'image'
  src: string
  originSrc?: string
  alt?: string
  width?: number
  height?: number
  style?: ImageStyle
}

export interface DocPageBreakBlock {
  type: 'pageBreak'
}

export interface DocHtmlBlock {
  type: 'html'
  html: string
}

export interface ParagraphStyle {
  align?: 'left' | 'center' | 'right' | 'justify'
  indentLeft?: number
  indentRight?: number
  indentFirstLine?: number
  lineHeight?: number
  spaceBefore?: number
  spaceAfter?: number
}

export interface RunStyle {
  fontFamily?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  link?: string
}

export interface ImageStyle {
  align?: 'left' | 'center' | 'right'
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number
}
