export type {
  RedHeaderType,
  RedHeader,
  RedHeaderTemplateParams,
  RedHeaderDetectResult
} from './types'

export {
  extractRedHeader,
  detectRedHeaderType,
  hasRedHeader,
  extractRedHeaderFromMarkdown
} from './detector'

export {
  createRedLine,
  createSimpleRedHeader,
  createGovernmentRedHeader,
  createPartyRedHeader,
  createRedHeader
} from './templates'
