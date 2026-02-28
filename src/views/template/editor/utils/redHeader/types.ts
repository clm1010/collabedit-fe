export type RedHeaderType = 'party' | 'government' | 'military' | 'custom'

export interface RedHeader {
  type: RedHeaderType
  header: string
  rest: string
}

export interface RedHeaderTemplateParams {
  organization: string
  title: string
  documentNumber: string
  date: string
  recipient?: string
  securityLevel?: string
  urgencyLevel?: string
}

export interface RedHeaderDetectResult {
  isRedHeader: boolean
  type?: RedHeaderType
  header?: string
  rest?: string
}
