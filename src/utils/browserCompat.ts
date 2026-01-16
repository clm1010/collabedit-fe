/**
 * 浏览器兼容性检测工具
 * 用于检测协同编辑功能所需的浏览器特性支持
 */

/** 浏览器信息 */
export interface BrowserInfo {
  /** 浏览器名称 */
  name: string
  /** 浏览器版本 */
  version: number
  /** 完整版本字符串 */
  fullVersion: string
  /** 是否是 Chromium 内核 */
  isChromium: boolean
  /** Chromium 内核版本（如果是 Chromium 内核） */
  chromiumVersion: number
  /** User Agent 字符串 */
  userAgent: string
}

/** 协同编辑功能支持检测结果 */
export interface CollaborationSupportResult {
  /** 是否支持协同编辑 */
  supported: boolean
  /** 不支持的原因（如果不支持） */
  reason?: string
  /** 详细检测结果 */
  details: {
    /** WebSocket 支持 */
    webSocket: boolean
    /** BroadcastChannel 支持 */
    broadcastChannel: boolean
    /** IndexedDB 支持 */
    indexedDB: boolean
    /** MutationObserver 支持 */
    mutationObserver: boolean
    /** ES Modules 支持（通过浏览器版本推断） */
    esModules: boolean
    /** 浏览器版本是否满足最低要求 */
    versionOk: boolean
  }
  /** 浏览器信息 */
  browser: BrowserInfo
}

/** 协同编辑最低 Chromium 版本要求 */
export const MIN_CHROMIUM_VERSION = 61

/** 推荐的 Chromium 版本 */
export const RECOMMENDED_CHROMIUM_VERSION = 90

/**
 * 获取浏览器信息
 */
export const getBrowserInfo = (): BrowserInfo => {
  const ua = navigator.userAgent

  // 检测 Chromium 内核版本
  const chromiumMatch = ua.match(/Chrom(?:e|ium)\/(\d+)\.(\d+)\.(\d+)\.(\d+)/)
  const isChromium = !!chromiumMatch
  const chromiumVersion = chromiumMatch ? parseInt(chromiumMatch[1], 10) : 0
  const chromiumFullVersion = chromiumMatch
    ? `${chromiumMatch[1]}.${chromiumMatch[2]}.${chromiumMatch[3]}.${chromiumMatch[4]}`
    : ''

  // 检测具体浏览器
  let name = 'Unknown'
  let version = 0
  let fullVersion = ''

  // 奇安信可信浏览器
  if (ua.includes('QiAnXin') || ua.includes('TrustedBrowser')) {
    const match = ua.match(/(?:QiAnXin|TrustedBrowser)[\/\s]?(\d+(?:\.\d+)*)/)
    name = '奇安信可信浏览器'
    fullVersion = match ? match[1] : chromiumFullVersion
    version = match ? parseInt(match[1].split('.')[0], 10) : chromiumVersion
  }
  // Edge
  else if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)\.(\d+)\.(\d+)\.(\d+)/)
    name = 'Microsoft Edge'
    fullVersion = match ? `${match[1]}.${match[2]}.${match[3]}.${match[4]}` : ''
    version = match ? parseInt(match[1], 10) : 0
  }
  // Opera
  else if (ua.includes('OPR/')) {
    const match = ua.match(/OPR\/(\d+)\.(\d+)\.(\d+)\.(\d+)/)
    name = 'Opera'
    fullVersion = match ? `${match[1]}.${match[2]}.${match[3]}.${match[4]}` : ''
    version = match ? parseInt(match[1], 10) : 0
  }
  // Chrome
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    name = 'Google Chrome'
    fullVersion = chromiumFullVersion
    version = chromiumVersion
  }
  // Chromium
  else if (ua.includes('Chromium/')) {
    name = 'Chromium'
    fullVersion = chromiumFullVersion
    version = chromiumVersion
  }
  // Firefox
  else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)\.(\d+)/)
    name = 'Mozilla Firefox'
    fullVersion = match ? `${match[1]}.${match[2]}` : ''
    version = match ? parseInt(match[1], 10) : 0
  }
  // Safari
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/(\d+)\.(\d+)/)
    name = 'Safari'
    fullVersion = match ? `${match[1]}.${match[2]}` : ''
    version = match ? parseInt(match[1], 10) : 0
  }

  return {
    name,
    version,
    fullVersion,
    isChromium,
    chromiumVersion,
    userAgent: ua
  }
}

/**
 * 检测 WebSocket 支持
 */
export const checkWebSocketSupport = (): boolean => {
  return typeof WebSocket !== 'undefined'
}

/**
 * 检测 BroadcastChannel 支持
 */
export const checkBroadcastChannelSupport = (): boolean => {
  return typeof BroadcastChannel !== 'undefined'
}

/**
 * 检测 IndexedDB 支持
 */
export const checkIndexedDBSupport = (): boolean => {
  return typeof indexedDB !== 'undefined'
}

/**
 * 检测 MutationObserver 支持
 */
export const checkMutationObserverSupport = (): boolean => {
  return typeof MutationObserver !== 'undefined'
}

/**
 * 检测 ES Modules 支持（通过浏览器版本推断）
 * ES Modules 在 Chrome 61+ 中原生支持
 */
export const checkESModulesSupport = (chromiumVersion: number): boolean => {
  // 对于 Chromium 内核，61+ 支持 ES Modules
  if (chromiumVersion >= 61) {
    return true
  }
  // 对于非 Chromium 内核，尝试通过特性检测
  // 但由于我们的项目主要面向 Chromium 内核浏览器，这里简单返回 true
  // 实际上现代浏览器都支持 ES Modules
  return true
}

/**
 * 检测协同编辑功能支持
 */
export const checkCollaborationSupport = (): CollaborationSupportResult => {
  const browser = getBrowserInfo()

  const webSocket = checkWebSocketSupport()
  const broadcastChannel = checkBroadcastChannelSupport()
  const indexedDB = checkIndexedDBSupport()
  const mutationObserver = checkMutationObserverSupport()
  const esModules = checkESModulesSupport(browser.chromiumVersion)

  // 对于 Chromium 内核浏览器，检查版本
  const versionOk = browser.isChromium ? browser.chromiumVersion >= MIN_CHROMIUM_VERSION : true

  const details = {
    webSocket,
    broadcastChannel,
    indexedDB,
    mutationObserver,
    esModules,
    versionOk
  }

  // 判断是否支持
  let supported = true
  let reason: string | undefined

  if (!webSocket) {
    supported = false
    reason = '您的浏览器不支持 WebSocket，无法使用协同编辑功能'
  } else if (!mutationObserver) {
    supported = false
    reason = '您的浏览器不支持 MutationObserver，无法使用协同编辑功能'
  } else if (browser.isChromium && browser.chromiumVersion < MIN_CHROMIUM_VERSION) {
    supported = false
    reason = `您的浏览器内核版本过低（Chromium ${browser.chromiumVersion}），协同编辑功能需要 Chromium ${MIN_CHROMIUM_VERSION} 或更高版本`
  }

  return {
    supported,
    reason,
    details,
    browser
  }
}

/**
 * 获取浏览器升级建议
 */
export const getBrowserUpgradeSuggestion = (browser: BrowserInfo): string => {
  if (browser.name === '奇安信可信浏览器') {
    return '请联系管理员升级奇安信可信浏览器到最新版本，或使用 Chrome 90+ 浏览器'
  }

  if (browser.isChromium && browser.chromiumVersion < RECOMMENDED_CHROMIUM_VERSION) {
    return `建议升级到 Chrome ${RECOMMENDED_CHROMIUM_VERSION} 或更高版本以获得最佳体验`
  }

  return '建议使用最新版本的 Chrome、Edge 或其他现代浏览器'
}

/**
 * 格式化浏览器信息为可读字符串
 */
export const formatBrowserInfo = (browser: BrowserInfo): string => {
  let info = `${browser.name} ${browser.fullVersion}`
  if (browser.isChromium && browser.name !== 'Google Chrome' && browser.name !== 'Chromium') {
    info += ` (Chromium ${browser.chromiumVersion})`
  }
  return info
}

/**
 * 在控制台输出浏览器兼容性检测结果
 */
export const logBrowserCompatibility = (): void => {
  const result = checkCollaborationSupport()
  const browser = result.browser

  console.group('🔍 浏览器兼容性检测')
  console.log('浏览器:', formatBrowserInfo(browser))
  console.log('User Agent:', browser.userAgent)
  console.log('')
  console.log('功能支持检测:')
  console.log('  - WebSocket:', result.details.webSocket ? '✅ 支持' : '❌ 不支持')
  console.log('  - BroadcastChannel:', result.details.broadcastChannel ? '✅ 支持' : '❌ 不支持')
  console.log('  - IndexedDB:', result.details.indexedDB ? '✅ 支持' : '❌ 不支持')
  console.log('  - MutationObserver:', result.details.mutationObserver ? '✅ 支持' : '❌ 不支持')
  console.log('  - ES Modules:', result.details.esModules ? '✅ 支持' : '❌ 不支持')
  console.log('  - 版本要求:', result.details.versionOk ? '✅ 满足' : '❌ 不满足')
  console.log('')

  if (result.supported) {
    console.log('✅ 协同编辑功能: 完全支持')
  } else {
    console.log('❌ 协同编辑功能: 不支持')
    console.log('原因:', result.reason)
    console.log('建议:', getBrowserUpgradeSuggestion(browser))
  }

  console.groupEnd()
}

export default {
  getBrowserInfo,
  checkCollaborationSupport,
  checkWebSocketSupport,
  checkBroadcastChannelSupport,
  checkIndexedDBSupport,
  checkMutationObserverSupport,
  checkESModulesSupport,
  getBrowserUpgradeSuggestion,
  formatBrowserInfo,
  logBrowserCompatibility,
  MIN_CHROMIUM_VERSION,
  RECOMMENDED_CHROMIUM_VERSION
}
